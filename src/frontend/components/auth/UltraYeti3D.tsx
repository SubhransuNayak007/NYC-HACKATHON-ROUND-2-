"use client";

import React from "react";
import { ThreeYetiMascot, MascotMode, ThreeYetiMascotProps } from "./ThreeYetiMascot";

export type { MascotMode, ThreeYetiMascotProps };

export function UltraYeti3D(props: ThreeYetiMascotProps) {
  return <ThreeYetiMascot {...props} />;
}
