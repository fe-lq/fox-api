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
      baseURL: `https://api.apifox.com/v1/projects/${projectId}`,
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

  /**
   * 获取所有API
   * @returns
   */
  fetchAllApis(): Promise<any> {
    return this.instance.post("/export-openapi", {
      ...baseParams,
      scope: {
        type: "ALL",
        selectedTags: [],
      },
    });
  }

  /**
   * 根据标签获取API
   * @param tag 标签
   * @returns
   */
  fetchApiByTag(tag: string): Promise<any> {
    return this.instance.post("/export-openapi", {
      ...baseParams,
      scope: {
        type: "SELECTED_TAGS",
        selectedTags: [tag],
      },
    });
  }

  /**
   * 导入API
   * @param data
   */
  fetchImportApi(input: any) {
    return this.instance.post("/import-openapi", {
      ...baseParams,
      input,
    });
  }
}
