import * as vscode from "vscode";
import { CreateHttp } from "./api";
import { genInterfaceFile } from "./utils/create-file";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "fox-api" is now active!');

  let disposable = vscode.commands.registerCommand("fox-api", async () => {
    const { apifoxProjectId, apifoxApiToken } =
      vscode.workspace.getConfiguration("fox-api");
    if (!apifoxProjectId || !apifoxApiToken) {
      vscode.window.showErrorMessage("请先配置apifox项目ID和ApiToken");
      return;
    }
    const http = new CreateHttp(apifoxProjectId, apifoxApiToken);
    try {
      const data = await http.fetchAllApis();
      const list = data.tags.map((item: any) => item.name);
      const tag = await vscode.window.showQuickPick(list, {
        title: "接口分类",
        placeHolder: "请输入接口分类",
      });
      if (tag) {
        const res = await http.fetchApiByTag(tag);
        genInterfaceFile(res);
      }
    } catch (error) {
      vscode.window.showErrorMessage("apifox请求失败");
      console.error("fox-api apifox请求失败", error);
    }
  });

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
