import {
  IAuth,
  IChatMessage,
  ModelEndpoint,
  Models,
} from './type';
import { ChatRequestParameters } from './chatRequestParameters';

export class QFClient {
  private apiKey: string;
  private secretKey: string;
  private auth!: IAuth;
  private baseURL = 'https://aip.baidubce.com';

  private headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  public async createAuthTokenAsync() {
    const url = `${this.baseURL}/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`;
    const resp = await fetch(url, {
      headers: this.headers,
    });
    const data = await resp.json();
    if (resp.status === 200) {
      this.auth = data;
      return data;
    } else {
      throw new Error(JSON.stringify(data));
    }
  }

  async chatAsStreamAsync(
    model: Models = Models.ERNIE_Bot_turbo,
    messages: IChatMessage[],
    parameters?: ChatRequestParameters,
    abortController?: AbortController
  ) {
    const { expires_in, access_token } = this.auth || {};
    if (!access_token || expires_in < Date.now() / 1000) {
      await this.createAuthTokenAsync();
    }
    const body = JSON.stringify({
      messages,
      stream: true,
      ...parameters,
    });
    const url = `${this.baseURL}/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${ModelEndpoint[model]}?access_token=${this.auth.access_token}`;

    const resp = await fetch(url, {
      method: 'POST',
      body,
      headers: this.headers,
      signal: abortController?.signal,
    });
    if (resp.status === 200) {
      return resp;
    } else {
      throw new Error(JSON.stringify(resp));
    }
  }
}
