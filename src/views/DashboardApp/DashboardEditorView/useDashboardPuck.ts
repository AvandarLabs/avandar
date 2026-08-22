import type { AvaPageConfig } from "@/views/DashboardApp/AvaPage/AvaPage.types";

import { createUsePuck } from "@puckeditor/core";

export const useDashboardPuck = createUsePuck<AvaPageConfig>();
