import * as vscode from "vscode";
import { CreateHttp } from "../api";
import { genInterfaceFile } from "../utils/create-file";
import path from "path";
/**
 * 创建并注册一个用于将API数据推送到Apifox的命令。
 * 该函数没有参数和返回值，因为它直接注册了一个命令，并不直接返回结果。
 * 注册的命令需要在VSCode的扩展中被触发。
 */
export const createPush = () => {
  // 注册一个命令，命令id为"fox-api.push"，执行时会调用提供的回调函数
  const push = vscode.commands.registerCommand("fox-api.push", async () => {
    // 从VSCode的工作区配置中读取apifox项目ID和ApiToken
    const { apifoxProjectId, apifoxApiToken } =
      vscode.workspace.getConfiguration("fox-api");

    // 检查项目ID和ApiToken是否已配置，未配置则显示错误消息
    if (!apifoxProjectId || !apifoxApiToken) {
      vscode.window.showErrorMessage("请先配置apifox项目ID和ApiToken");
      return;
    }

    // 初始化HTTP客户端，用于与Apifox进行通信
    const http = new CreateHttp(apifoxProjectId, apifoxApiToken);
    try {
      // 获取当前工作区的路径
      const workspaceFolders = vscode.workspace.workspaceFolders;
      // 检查是否打开了工作区，未打开则显示错误消息
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("没有打开的工作区");
        return;
      }

      // 获取工作区的根目录路径，并让用户选择一个文件夹
      const workspacePath = workspaceFolders[0].uri.fsPath;
      const selectedPath = await selectPathRecursively(workspacePath);

      // 如果用户未选择文件夹，则终止操作
      if (!selectedPath) {
        return;
      }

      // 读取用户选择文件的内容
      const fileUri = vscode.Uri.file(selectedPath);
      const fileContent = await vscode.workspace.fs.readFile(fileUri);

      // 将文件内容转换为字符串显示
      const content = Buffer.from(fileContent).toString("utf8");
      // 将文件内容中的API数据导入到Apifox
      await http.fetchImportApi(content);
      // 导入成功后显示信息消息
      vscode.window.showInformationMessage("导入ApiFox成功");
    } catch (error) {
      // 处理导入过程中的任何错误，并显示错误消息
      vscode.window.showErrorMessage("导出apifox失败");
      console.error("fox-api 导出失败", error);
    }
  });

  // 返回注册的命令，可能用于之后的注销操作
  return push;
};

/**
 * 递归选择文件或文件夹
 * @param currentPath 当前路径字符串
 * @returns 返回所选文件或文件夹的路径字符串。如果用户没有选择，则返回null。
 */
async function selectPathRecursively(currentPath: string) {
  // 读取当前路径下的所有文件和文件夹
  const items = await vscode.workspace.fs.readDirectory(
    vscode.Uri.file(currentPath)
  );

  // 筛选出文件夹，并排除'node_modules'和以'.'开头的隐藏文件夹
  const folderItems = items
    .filter(
      ([name, type]) =>
        type === vscode.FileType.Directory &&
        name !== "node_modules" &&
        !name.startsWith(".")
    )
    .map(([name]) => ({
      label: `📁 ${name}`, // 为文件夹项添加标签
      description: path.join(currentPath, name), // 添加完整路径作为描述
      isDirectory: true, // 标记为文件夹
    }));

  // 筛选出以'.json'结尾的文件
  const fileItems = items
    .filter(
      ([name, type]) => type === vscode.FileType.File && name.endsWith(".json")
    )
    .map(([name]) => ({
      label: name, // 使用文件名作为标签
      description: path.join(currentPath, name), // 添加完整路径作为描述
      isDirectory: false, // 标记为文件
    }));

  // 准备包含所有可选择项的数组，包括返回上一级的选项
  const pickItems = [
    ...folderItems,
    ...fileItems,
    { label: "🔙 返回上一级", description: ".." },
  ];

  // 显示快速选择菜单，并等待用户选择
  const selected = (await vscode.window.showQuickPick(pickItems, {
    placeHolder: "选择一个文件或文件夹",
  })) as {
    label: string;
    description: string;
    isDirectory: boolean;
  };

  // 如果用户未选择，则返回null
  if (!selected) {
    return null;
  }

  // 如果用户选择返回上一级，则递归调用当前函数以返回上一级路径
  if (selected.description === "..") {
    return selectPathRecursively(path.dirname(currentPath));
  }

  // 如果用户选择的是文件夹，则递归调用当前函数以继续在该文件夹内选择
  if (selected.isDirectory) {
    return selectPathRecursively(selected.description);
  } else {
    // 如果用户选择的是文件，则直接返回该文件的路径
    return selected.description;
  }
}
