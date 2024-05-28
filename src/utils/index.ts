import prettier from "prettier";
import { promises as fs } from 'fs';
import path from "path";
import * as vscode from "vscode";

export const prettierFile = (values: any) => prettier.format(values, {
  parser: "typescript",
});

export async function createFile(filePath: string, content: any) {
  try {
    // 获取文件所在的目录
    const dir = path.dirname(filePath);
    // 检查目录是否存在，如果不存在则创建
    await fs.mkdir(dir, { recursive: true });
    const prettierContent = await prettierFile(content);
    // 目录创建成功后，创建文件
    await fs.writeFile(filePath, prettierContent);
    console.log(`fox-api File created successfully at ${filePath}`);
    vscode.window.showInformationMessage(`文件生成成功 ${filePath}`);
  } catch (err: any) {
    console.error(`fox-api Error: ${err}`);
    vscode.window.showErrorMessage("文件生成失败");
  }
}
