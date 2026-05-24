export type CandidateStatus = "pending" | "screened" | "interview" | "hired" | "rejected"

export interface BasicInfo {
  name: string
  phone: string
  email: string
  city: string
}

export interface EducationItem {
  school: string
  major: string
  degree: string
  graduationDate: string
}

export interface WorkExperienceItem {
  company: string
  title: string
  period: string
  summary: string
}

export interface ProjectItem {
  projectName: string
  techStack: string[]
  responsibility: string
  highlights: string
}

export interface ResumeStructured {
  basicInfo: BasicInfo
  education: EducationItem[]
  workExperience: WorkExperienceItem[]
  skillTags: string[]
  projects: ProjectItem[]
}

export interface CandidateScore {
  total: number
  skill: number
  experience: number
  education: number
  comment: string
}

export interface Candidate {
  id: string
  filename: string
  fileUrl: string
  rawText: string
  cleanedText: string
  structuredData: ResumeStructured | null
  status: CandidateStatus
  createdAt: string
  updatedAt: string
}

export interface JobDescriptionInput {
  title: string
  description: string
  requiredSkills: string[]
  bonusSkills: string[]
}

export interface CandidateWithScore extends Candidate {
  score?: CandidateScore
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
