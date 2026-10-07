import { request } from "@/lib/api";

export type TokenInput = {
  subpadId?: number;
  tokenName: string;
  tokenSymbol: string;
};

export function createToken(input: TokenInput) {
  return request("/api/token_info/create", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
