// TODO: replace with the official enquiry inbox before going live.
export const CONTACT_EMAIL = "hello@shagoonsoftech.com";

export interface PlatformModule {
  name: string;
  summary: string;
  features: string[];
}

export const PLATFORM_MODULES: PlatformModule[] = [
  { name: "Human Resources", summary: "Your people, records and performance in one place.", features: ["Employee management", "Attendance", "Leave management", "Payroll integration", "Employee documents", "Performance management", "Recruitment"] },
  { name: "CRM", summary: "Every lead, customer and conversation, tracked.", features: ["Lead management", "Customer database", "Sales pipeline", "Follow-ups", "Communication tracking", "Customer history"] },
  { name: "Sales", summary: "From quotation to commission without the spreadsheets.", features: ["Quotations", "Orders", "Invoices", "Sales tracking", "Sales targets", "Commission management"] },
  { name: "Finance", summary: "A clear, live view of money in and money out.", features: ["Expenses", "Revenue", "Receivables", "Payables", "Financial reports", "Accounting integrations"] },
  { name: "Inventory", summary: "Know what you have, where it is and what's moving.", features: ["Stock management", "Purchase orders", "Suppliers", "Warehouses", "Stock movement", "Inventory reports"] },
  { name: "Projects", summary: "Plan, allocate and deliver on time.", features: ["Project management", "Task management", "Team allocation", "Deadlines", "Project tracking"] },
  { name: "Procurement", summary: "Structured buying with approvals built in.", features: ["Vendor management", "Purchase requests", "Purchase approvals", "Purchase orders"] },
  { name: "Operations", summary: "Workflows and approvals that run themselves.", features: ["Workflow management", "Approval systems", "Task allocation", "Operational dashboards", "Automated notifications"] },
  { name: "Analytics", summary: "Decisions backed by live business data.", features: ["Business dashboards", "Sales analytics", "Employee analytics", "Financial analytics", "Operational reports", "Custom KPIs"] },
  { name: "Automation", summary: "Let the system handle the repetitive work.", features: ["Automated workflows", "Alerts", "Notifications", "Approval automation", "Scheduled reports", "AI-assisted processes"] },
];
