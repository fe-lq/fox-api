import * as vscode from "vscode";
import { createPull } from "./commands/pull";
import { createPush } from "./commands/push";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "fox-api" is now active!');

  context.subscriptions.push(createPull());
  context.subscriptions.push(createPush());
}

// This method is called when your extension is deactivated
export function deactivate() {}
