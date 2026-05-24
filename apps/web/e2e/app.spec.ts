import { expect, test } from "@playwright/test"

const candidate = {
  id: "9a57a9ec-b8f6-4b3d-9fcb-a1fb8a5e4f22",
  filename: "张三-前端工程师.pdf",
  fileUrl: "/uploads/mock.pdf",
  rawText: "raw text",
  cleanedText: "react typescript",
  structuredData: {
    basicInfo: {
      name: "张三",
      phone: "13800000000",
      email: "zhangsan@example.com",
      city: "上海",
    },
    education: [],
    workExperience: [],
    skillTags: ["React", "TypeScript"],
    projects: [],
  },
  status: "pending",
  createdAt: "2026-03-07T08:00:00.000Z",
  updatedAt: "2026-03-07T08:00:00.000Z",
}

const jd = {
  id: "57f0671e-0a72-486c-a118-ef6b8f57f1a0",
  title: "前端开发工程师",
  description: "负责 React 前端开发",
  required_skills: ["React", "TypeScript"],
  bonus_skills: ["Node.js"],
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/candidates*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [candidate] }),
    })
  })

  await page.route(`**/api/candidates/${candidate.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: candidate }),
    })
  })

  await page.route("**/api/jobs", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [jd] }),
    })
  })
})

test("renders core modules and candidate list", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "Sidereus AI 招聘助手" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "简历上传与解析" }).nth(0)).toBeVisible()
  await expect(page.getByRole("heading", { name: "候选人管理面板" }).first()).toBeVisible()
  await expect(page.getByText("张三-前端工程师.pdf")).toBeVisible()
})

test("opens candidate detail after selecting candidate", async ({ page }) => {
  await page.goto("/")

  await page.getByText("张三-前端工程师.pdf").first().click()

  await expect(page.getByRole("heading", { name: "候选人详情" })).toBeVisible()
  await expect(page.getByRole("button", { name: "AI 提取（SSE）" })).toBeVisible()
})
