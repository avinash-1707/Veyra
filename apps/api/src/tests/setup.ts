import { vi } from "vitest";

vi.mock("../modules/discovery/repository.js", () => import("./discovery-repository.mock.js"));
