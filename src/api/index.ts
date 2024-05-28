import axios from "axios";

const baseParams = {
  options: {
    includeApidogExtensionProperties: false,
    addFoldersToTags: false,
  },
  oasVersion: "3.1",
  exportFormat: "JSON",
};

/**
 * 创建一个axios实例
 * @param projectId 项目ID
 * @param apiToken API Token
 */
export class CreateHttp {
  instance: any;
  constructor(projectId: string, apiToken: string) {
    this.instance = axios.create({
      baseURL: `https://api.apifox.com/v1/projects/${projectId}/export-openapi`,
      headers: {
        "X-Apifox-Api-Version": "2024-01-20",
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });
    this.instance.interceptors.response.use(
      (response: { data: any }) => response.data,
      (error: any) => {
        return Promise.reject(error);
      }
    );
  }

  // 获取所有API
  fetchAllApis(): Promise<any> {
    return this.instance.post("", {
      ...baseParams,
      scope: {
        type: "ALL",
        selectedTags: [],
      },
    });
  }

  fetchApiByTag(tag: string): Promise<any> {
    return this.instance.post("", {
      ...baseParams,
      scope: {
        type: "SELECTED_TAGS",
        selectedTags: [tag],
      },
    });
  }
}
