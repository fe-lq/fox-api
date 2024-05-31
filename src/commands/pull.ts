import * as vscode from "vscode";
import { CreateHttp } from "../api";
import { genInterfaceFile } from "../utils/create-file";
export const createPull = () => {
  const pull = vscode.commands.registerCommand("fox-api.pull", async () => {
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
      // 选择分类
      const tag = await vscode.window.showQuickPick(["全部接口"].concat(list), {
        title: "接口分类",
        placeHolder: "请输入接口分类",
      });
      if (tag) {
        if (tag === "全部接口") {
          const all = await Promise.all(
            list.map((item: any) => http.fetchApiByTag(item.name))
          );
          all.forEach((item: any) => genInterfaceFile(item));
        } else {
          // 获取分类下的接口
          const res = await http.fetchApiByTag(tag);
          genInterfaceFile(res);
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage("获取apifox失败");
      console.error("fox-api 获取失败", error);
    }
  });
  return pull;
};
