import * as vscode from "vscode";
import { createFile } from "./index";
import { get, isEmpty } from "lodash";

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
const getMapType = (ref: string) => {
  return ref.slice(2).replace(/\//g, ".");
};

/**
 * 处理映射的类型
 */
const getProps = (obj: Record<string, any>, dataObj: Record<string, any>) => {
  if (obj.$ref) {
    const objLink = getMapType(obj.$ref);
    obj = get(dataObj, objLink, {});
  }
  if (obj.type === "array") {
    if (obj.items.$ref) {
      const objLink = getMapType(obj.items.$ref);
      obj.items = get(dataObj, objLink, {});
    }
  }
  return obj;
};

const getTsType = (obj: string, type: "Request" | "Response") => {
  // 数组、枚举、简单类型用type关键字
  if (
    obj.endsWith("[]") ||
    obj.includes(" | ") ||
    obj === "unknown" ||
    obj === "string" ||
    obj === "number" ||
    obj === "boolean" ||
    obj === "null"
  ) {
    return `type ${type} = ${obj}`;
  }
  return `interface ${type} ${obj}`;
};

// 递归函数，用于将 JSON 转换为 TypeScript 接口定义
function jsonToTsInterface(obj: Record<string, any>) {
  let namespace = "";
  let interfaceString = ``;
  const methods: string[] = [];
  const { paths, tags } = obj;
  for (const key in paths) {
    namespace = getNamespace(key);
    // 方法名
    const method = Object.keys(paths[key])[0];

    const { responses, requestBody, parameters, operationId } = paths[key][method];
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
          props.properties[item.name] = { type: item.schema.type };
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
    const reqProps = keyOfProperties(req, obj);
    const resProps = keyOfProperties(res, obj);
    // 判断是不是数组
    interfaceString += `
/** ${operationId} */
export namespace ${namespace} {
  export ${getTsType(reqProps, "Request")}
  \n
  export ${getTsType(resProps, "Response")}
  \n
  export const request = ${methodConfig[method]}<Response, Request>('${key}')
} 
\n`;
  }
  interfaceString =
`
/** ${tags[0].name} */
import { ${methods.join(", ")} } from "@/http";
` + interfaceString;
  return interfaceString;
}

// 将 JSON schema 的 properties 中的键转换为 PascalCase（TypeScript 接口属性通常使用 PascalCase）
function keyOfProperties(
  data: Record<string, any>,
  obj: Record<string, any>
): any {
  let requestData = getProps(data, obj);
  const isArr = data.type === "array";
  if (isArr) {
    requestData = data.items;
  }

  const { properties, required = [], type, enum: enumType } = requestData;
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
          `${key}${required.includes(key) ? "" : "?"}: ${keyOfProperties(properties[key], obj)};`
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
