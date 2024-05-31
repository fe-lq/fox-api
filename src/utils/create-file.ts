import * as vscode from "vscode";
import { createFile } from "./index";
import { isEmpty } from "lodash";

// 客户端使用的请求方法
const methodConfig: Record<string, string> = {
  get: "httpGet",
  post: "httpPost",
  put: "httpPut",
};

/**
 *
 * @param path 路由地址
 * @returns 获取命名空间
 */
const getNamespace = (path: string) => {
  const arr = path.split("/");
  return arr.reduce(
    (a, i) => (a += i.charAt(0).toUpperCase() + i.slice(1)),
    ""
  );
};

/**
 *
 * @param ref 引用地址
 * @returns 引用名称
 */
const getMapType = (ref: string): string => {
  return ref.split("/").pop() || "unknown";
};

/**
 * 处理映射的类型
 */
const getProps = (obj: Record<string, any>) => {
  if (obj.$ref) {
    const typeName = getMapType(obj.$ref);
    obj.$ref = typeName;
  }
  if (obj.type === "array") {
    if (obj.items.$ref) {
      const typeName = getMapType(obj.items.$ref);
      obj.items.$ref = typeName;
    }
  }
  return obj;
};

const getTsType = (obj: string, type: string) => {
  // 数组、枚举、简单类型用type关键字
  if (obj.startsWith("{") && obj.endsWith("}")) {
    return `interface ${type} ${obj}`;
  }
  return `type ${type} = ${obj}`;
};

/**
 *
 * @param description 接口或字段描述
 * @returns 拼接到接口文档的注释
 */
const setDesc = (description?: string) => {
  return description ? `/** ${description} */` : ``;
};

// 递归函数，用于将 JSON 转换为 TypeScript 接口定义
function jsonToTsInterface(obj: Record<string, any>) {
  let namespace = "";
  let httpInterfaceString = ``;
  let schemasString = ``;
  const methods: string[] = [];
  const { paths, tags, components } = obj;
  // 遍历每个路由地址
  for (const key in paths) {
    namespace = getNamespace(key);
    // 方法名
    const method = Object.keys(paths[key])[0];

    const { responses, requestBody, parameters, description } =
      paths[key][method];
    if (!methods.includes(methodConfig[method])) {
      // 收集使用方法名用于在文件头部引用
      methods.push(methodConfig[method]);
    }
    let req: Record<string, any> = {};
    let res: Record<string, any> = {};
    // 处理get请求参数,转换成post请求参数的格式方便统一处理
    if (method === "get" && parameters.length) {
      req = parameters.reduce(
        (props: any, item: any) => {
          props.properties[item.name] = {
            type: item.schema.type,
            enum: item.schema.enum,
            description: item.description,
          };
          if (item.required) {
            props.required.push(item.name);
          }
          return props;
        },
        { properties: {}, required: [] }
      );
      // 处理post请求参数
    } else if (method === "post" && requestBody) {
      req = requestBody["content"]["application/json"]["schema"];
    }
    // 处理响应结果
    if (responses["200"]) {
      res = responses["200"]["content"]["application/json"]["schema"];
    }
    const reqProps = keyOfProperties(req);
    const resProps = keyOfProperties(res);
    // 判断是不是数组
    httpInterfaceString += `
${setDesc(description)}
export namespace ${namespace} {
  export ${getTsType(reqProps, "Request")}
  \n
  export ${getTsType(resProps, "Response")}
  \n
  export const request = ${methodConfig[method]}<Response, Request>('${key}')
} 
\n`;
  }

  // 遍历components的映射接口类型
  for (const key in components.schemas) {
    const schemasItem = components.schemas[key];
    const props = keyOfProperties(schemasItem);
    schemasString += `
  ${setDesc(schemasItem.description)}
  export ${getTsType(props, key)}
  \n`;
  }

  const allInterfaceString =
    `
/** ${tags[0].name} */
import { ${methods.join(", ")} } from "@/http";
` +
    httpInterfaceString +
    schemasString;
  return allInterfaceString;
}

// 将 JSON schema 的 properties 中的键转换为 PascalCase（TypeScript 接口属性通常使用 PascalCase）
function keyOfProperties(data: Record<string, any>): any {
  let requestData = getProps(data);
  const isArr = data.type === "array";
  if (isArr) {
    requestData = data.items;
  }

  const {
    properties,
    required = [],
    type,
    enum: enumType,
    $ref,
    allOf,
    anyOf,
  } = requestData;
  // 有映射接口类型的情况
  if ($ref) {
    return `${$ref}${isArr ? "[]" : ""}`;
  }
  if (allOf) {
    return allOf.reduce((str: string, item: any, index: number) => {
      return (str +=
        keyOfProperties(item) + (index === allOf.length - 1 ? "" : " & "));
    }, ``);
  }
  if (anyOf) {
    return anyOf.reduce((str: string, item: any, index: number) => {
      return (str +=
        keyOfProperties(item) + (index === anyOf.length - 1 ? "" : " | "));
    }, ``);
  }
  // 简单类型的值
  if (type && type !== "object" && type !== "array") {
    if (enumType) {
      // 枚举类型
      return `(${enumType.map((i: any) => `"${i}"`).join(" | ")})${isArr ? "[]" : ""}`;
    }
    // 其他简单类型
    return `${type}${isArr ? "[]" : ""}`;
  }
  if (!properties || isEmpty(properties)) {
    return "unknown";
  }
  return `{
    ${Object.keys(properties)
      .map(
        (key) =>
          `
        ${setDesc(properties[key].description)}
        ${key}${required.includes(key) ? "" : "?"}: ${keyOfProperties(properties[key])};
        `
      )
      .join(`\n`)}  
  }${isArr ? "[]" : ""}`;
}

export const genInterfaceFile = (pathData: any) => {
  const fileName = Object.keys(pathData.paths)[0].split("/")[1];
  // 生成 TypeScript 接口字符串
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    const interfaceString = jsonToTsInterface(pathData);

    const tsFilePath = `${workspaceFolder.uri.fsPath}/src/api/${fileName}.ts`;
    createFile(tsFilePath, interfaceString);
  } else {
    vscode.window.showErrorMessage(`工作区获取失败`);
  }
};
