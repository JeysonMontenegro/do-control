"use client";

import type { ComponentProps } from "react";

import { MessagesSection } from "@/features/module1/components/messages-section";

type MessagesTabProps = ComponentProps<typeof MessagesSection>;

export function MessagesTab(props: MessagesTabProps) {
  return <MessagesSection {...props} />;
}
