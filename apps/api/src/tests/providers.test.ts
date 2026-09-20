import { parseAppEnvironment } from "@veyra/config";
import { describe, expect, it } from "vitest";

import { createEmailTransport, providerDescriptors } from "../providers.js";

describe("provider adapters", () => {
  it("reports provider configuration without opening connections", () => {
    const environment = parseAppEnvironment({ NODE_ENV: "development" });

    expect(providerDescriptors(environment).map((descriptor) => descriptor.status)).toEqual([
      "not_configured",
      "not_configured",
      "not_configured",
      "not_configured"
    ]);
  });

  it("creates email transport only when smtp config exists", () => {
    const missingEnvironment = parseAppEnvironment({ NODE_ENV: "development" });
    const configuredEnvironment = parseAppEnvironment({
      NODE_ENV: "development",
      SMTP_HOST: "smtp.example",
      SMTP_USER: "user",
      SMTP_PASS: "pass"
    });

    expect(createEmailTransport(missingEnvironment)).toBeNull();
    expect(createEmailTransport(configuredEnvironment)).not.toBeNull();
  });
});
