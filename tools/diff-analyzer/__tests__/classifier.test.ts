import { classifyFile } from "../src/classifier";

describe("classifyFile", () => {
  test("classifyFile_expressRoute", () => {
    const result = classifyFile("javascript/src/routes/auth.ts");

    expect(result).toBe("route");
  });

  test("classifyFile_javaController", () => {
    const result = classifyFile(
      "java/src/main/java/com/insurecrm/email/controller/SendEmailController.java"
    );

    expect(result).toBe("route");
  });

  test("classifyFile_typescriptType", () => {
    const result = classifyFile("javascript/src/types/auth.ts");

    expect(result).toBe("type");
  });

  test("classifyFile_javaModel", () => {
    const result = classifyFile(
      "java/src/main/java/com/insurecrm/email/model/EmailRequest.java"
    );

    expect(result).toBe("type");
  });

  test("classifyFile_openApiSpec", () => {
    const result = classifyFile("specs/express-openapi.json");

    expect(result).toBe("spec");
  });

  test("classifyFile_markdownDoc", () => {
    const result = classifyFile("docs/docs/api/auth-controller.md");

    expect(result).toBe("doc");
  });

  test("classifyFile_appConfig", () => {
    const result = classifyFile("javascript/src/app.ts");

    expect(result).toBe("config");
  });

  test("classifyFile_mkdocsConfig", () => {
    const result = classifyFile("docs/mkdocs.yml");

    expect(result).toBe("config");
  });

  test("classifyFile_pomXml", () => {
    const result = classifyFile("java/pom.xml");

    expect(result).toBe("config");
  });

  test("classifyFile_agentsMd", () => {
    const result = classifyFile("AGENTS.md");

    expect(result).toBe("config");
  });

  test("classifyFile_domainMapYaml", () => {
    const result = classifyFile("domain-map.yaml");

    expect(result).toBe("config");
  });

  test("classifyFile_unknownFile", () => {
    const result = classifyFile("scripts/generate-openapi-specs.sh");

    expect(result).toBe("unknown");
  });

  test("classifyFile_unknownPackageJson", () => {
    const result = classifyFile("javascript/package.json");

    expect(result).toBe("unknown");
  });
});
