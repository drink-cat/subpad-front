import { expect, test } from "vitest";
import { brandFromHost } from "./brand";

test("从主机名取出 subpad 品牌", () => {
  expect(brandFromHost("foods.launch.o1.local")).toBe("foods");
  expect(brandFromHost("Foods.Launch.O1.Local:80")).toBe("foods");
  expect(brandFromHost("launch.o1.local")).toBeNull();
  expect(brandFromHost("a.b.launch.o1.local")).toBeNull();
  expect(brandFromHost("localhost")).toBeNull();
});
