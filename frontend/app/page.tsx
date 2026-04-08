import { Suspense } from "react";

import { ClinicalConsole } from "@/features/module1/clinical-console";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ClinicalConsole />
    </Suspense>
  );
}
