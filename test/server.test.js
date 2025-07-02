import request from "supertest";
import app from "../src/server.js"; // Import the Express app
import fs from "fs/promises";

// Mock the core logic modules
jest.mock("../src/contentManager.js");
jest.mock("../src/articleGenerator.js");
jest.mock("../src/magazineGenerator.js", () => {
  return {
    MagazineGenerator: jest.fn().mockImplementation(() => {
      return {
        generateMagazine: jest
          .fn()
          .mockResolvedValue("path/to/fake/magazine.epub"),
      };
    }),
  };
});

// Mock fs/promises
jest.mock("fs/promises");
// jest.mock("fs/promises", () => ({
//   readFile: jest.fn(),
//   unlink: jest.fn().mockResolvedValue(),
// }));

describe("Web Server Tests", () => {

  beforeEach(async () => {
    jest.clearAllMocks();
    global.uploadedChats = {};
  });

  describe("GET /", () => {
    it("should return the upload form", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toEqual(200);
      expect(res.text).toContain("<h1>Upload Chat Export</h1>");
      expect(res.text).toContain(
        '<form action="/upload" method="post" enctype="multipart/form-data">'
      );
    });
  });

  describe("POST /upload", () => {
    const sampleClaudeExport = [
      {
        uuid: "chat1",
        name: "Chat 1",
        chat_messages: [{ sender: "human", text: "Hello" }],
      },
      {
        uuid: "chat2",
        name: "Chat 2",
        chat_messages: [{ sender: "assistant", text: "Hi" }],
      },
    ];
    const sampleClaudeExportString = JSON.stringify(sampleClaudeExport);

    it("should reject if no file is uploaded", async () => {
      const res = await request(app).post("/upload");
      expect(res.statusCode).toEqual(400);
      expect(res.text).toContain("No file uploaded");
    });

    it("should reject if the uploaded file is not JSON", async () => {
      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from("this is not json"), {
          filename: "test.txt",
          contentType: "text/plain",
        });
      expect(res.statusCode).toEqual(400);
      expect(res.text).toContain(
        "Invalid file type. Only JSON files are allowed."
      );
    });

    it("should process a valid JSON file and show chat selection", async () => {
      fs.readFile.mockResolvedValue(sampleClaudeExportString);

      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from(sampleClaudeExportString), {
          filename: "claude_export.json",
          contentType: "application/json",
        });

      expect(res.statusCode).toEqual(200);
      expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), "utf-8");
      expect(res.text).toContain("<h1>Select Chats to Include</h1>");
      expect(res.text).toContain("Chat 1");
      expect(res.text).toContain('value="chat1"');
      expect(res.text).toContain("Chat 2");
      expect(res.text).toContain('value="chat2"');
      expect(fs.unlink).toHaveBeenCalledWith(expect.any(String));

      expect(global.uploadedChats["claude_export.json"]).toBeDefined();
      expect(global.uploadedChats["claude_export.json"].length).toBe(2);
    });

    it("should handle JSON parsing errors", async () => {
      fs.readFile.mockResolvedValue("this is not valid json");

      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from("this is not valid json"), {
          filename: "broken.json",
          contentType: "application/json",
        });

      expect(res.statusCode).toEqual(500);
      expect(res.text).toContain("Error processing uploaded file");
      expect(fs.unlink).toHaveBeenCalledWith(expect.any(String));
    });

    it("should clean up uploaded file if mimetype is not JSON", async () => {
      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from("not json"), {
          filename: "notjson.txt",
          contentType: "text/plain",
        });
      expect(fs.unlink).toHaveBeenCalledWith(expect.any(String));
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /generate-epub", () => {
    const originalFilename = "claude_export.json";
    const chatData = [
      {
        id: "chat1",
        title: "Chat 1",
        originalChatData: {
          name: "Chat 1",
          uuid: "chat1",
          chat_messages: [{ sender: "human", text: "Test" }],
        },
      },
      {
        id: "chat2",
        title: "Chat 2",
        originalChatData: {
          name: "Chat 2",
          uuid: "chat2",
          chat_messages: [{ sender: "assistant", text: "Reply" }],
        },
      },
    ];

    beforeEach(() => {
      global.uploadedChats[originalFilename] = chatData;
    });

    it("should require selectedChats and originalFilename", async () => {
      const res = await request(app).post("/generate-epub").send({});
      expect(res.statusCode).toEqual(400);
      expect(res.text).toContain("Missing selection or filename");
    });

    it("should return 404 if chat data not found in global store", async () => {
      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: "chat1", originalFilename: "nonexistent.json" });
      expect(res.statusCode).toEqual(404);
      expect(res.text).toContain("Chat data not found");
    });

    it("should require at least one chat to be selected", async () => {
      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: [], originalFilename });
      expect(res.statusCode).toEqual(400);
      expect(res.text).toContain("No chats were selected");
    });

    it("should generate and download an EPUB for selected chats", async () => {
      const { MagazineGenerator: MockMagazineGenerator } = await import(
        "../src/magazineGenerator.js"
      );
      const { ContentManager: MockContentManager } = await import(
        "../src/contentManager.js"
      );

      const mockGenerateMagazine =
        MockMagazineGenerator.mock.results[0].value.generateMagazine;
      mockGenerateMagazine.mockResolvedValue(
        "path/to/generated/test_magazine.epub"
      );

      const mockAddChatHighlight =
        MockContentManager.mock.instances[0].addChatHighlight;

      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: "chat1", originalFilename });

      expect(res.statusCode).toEqual(200);
      expect(res.headers["content-disposition"]).toContain(
        'attachment; filename="test_magazine.epub"'
      );
      expect(res.headers["content-type"]).toEqual("application/epub+zip");

      expect(mockAddChatHighlight).toHaveBeenCalledTimes(1);
      expect(mockAddChatHighlight).toHaveBeenCalledWith(
        "Chat 1",
        expect.stringContaining("Human: Test"),
        expect.any(String),
        "Chat Exports"
      );
      expect(mockGenerateMagazine).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(
        "path/to/generated/test_magazine.epub"
      );
      expect(global.uploadedChats[originalFilename]).toBeUndefined();
    });

    it("should handle errors during EPUB generation", async () => {
      const { MagazineGenerator: MockMagazineGenerator } = await import(
        "../src/magazineGenerator.js"
      );
      const mockGenerateMagazine =
        MockMagazineGenerator.mock.results[0].value.generateMagazine;
      mockGenerateMagazine.mockRejectedValue(new Error("EPUB Gen Failed"));

      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: "chat1", originalFilename });

      expect(res.statusCode).toEqual(500);
      expect(res.text).toContain(
        "An unexpected error occurred while generating the EPUB"
      );
      expect(global.uploadedChats[originalFilename]).toBeUndefined();
    });

    it("should support selecting multiple chats", async () => {
      const { MagazineGenerator: MockMagazineGenerator } = await import(
        "../src/magazineGenerator.js"
      );
      const { ContentManager: MockContentManager } = await import(
        "../src/contentManager.js"
      );

      const mockGenerateMagazine =
        MockMagazineGenerator.mock.results[0].value.generateMagazine;
      mockGenerateMagazine.mockResolvedValue(
        "path/to/generated/test_magazine.epub"
      );

      const mockAddChatHighlight =
        MockContentManager.mock.instances[0].addChatHighlight;

      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: ["chat1", "chat2"], originalFilename });

      expect(res.statusCode).toEqual(200);
      expect(mockAddChatHighlight).toHaveBeenCalledTimes(2);
      expect(mockAddChatHighlight).toHaveBeenCalledWith(
        "Chat 1",
        expect.stringContaining("Human: Test"),
        expect.any(String),
        "Chat Exports"
      );
      expect(mockAddChatHighlight).toHaveBeenCalledWith(
        "Chat 2",
        expect.stringContaining("Assistant: Reply"),
        expect.any(String),
        "Chat Exports"
      );
      expect(mockGenerateMagazine).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(
        "path/to/generated/test_magazine.epub"
      );
      expect(global.uploadedChats[originalFilename]).toBeUndefined();
    });

    it("should clean up chat data if an error occurs before sending file", async () => {
      const { MagazineGenerator: MockMagazineGenerator } = await import(
        "../src/magazineGenerator.js"
      );
      const mockGenerateMagazine =
        MockMagazineGenerator.mock.results[0].value.generateMagazine;
      mockGenerateMagazine.mockImplementation(() => {
        throw new Error("fail");
      });

      const res = await request(app)
        .post("/generate-epub")
        .send({ selectedChats: "chat1", originalFilename });

      expect(res.statusCode).toBe(500);
      expect(global.uploadedChats[originalFilename]).toBeUndefined();
    });
  });

  // Additional edge case tests
  describe("Edge Cases", () => {
    it("should handle empty chat export array", async () => {
      fs.readFile.mockResolvedValue("[]");
      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from("[]"), {
          filename: "empty.json",
          contentType: "application/json",
        });
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("Select Chats to Include");
      expect(res.text).not.toContain('value="chat1"');
    });

    it("should handle missing chat name and uuid", async () => {
      const noNameExport = [
        { chat_messages: [{ sender: "human", text: "Hi" }] },
      ];
      fs.readFile.mockResolvedValue(JSON.stringify(noNameExport));
      const res = await request(app)
        .post("/upload")
        .attach("chatExport", Buffer.from(JSON.stringify(noNameExport)), {
          filename: "noname.json",
          contentType: "application/json",
        });
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("Chat 1 (no name)");
    });
  });
});

describe("GET /", () => {
  it("should return the upload form", async () => {
    const res = await request(app).get("/");
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain("<h1>Upload Chat Export</h1>");
    expect(res.text).toContain(
      '<form action="/upload" method="post" enctype="multipart/form-data">'
    );
  });
});

describe("POST /upload", () => {
  const sampleClaudeExport = [
    {
      uuid: "chat1",
      name: "Chat 1",
      chat_messages: [{ sender: "human", text: "Hello" }],
    },
    {
      uuid: "chat2",
      name: "Chat 2",
      chat_messages: [{ sender: "assistant", text: "Hi" }],
    },
  ];
  const sampleClaudeExportString = JSON.stringify(sampleClaudeExport);

  it("should reject if no file is uploaded", async () => {
    const res = await request(app).post("/upload");
    expect(res.statusCode).toEqual(400);
    expect(res.text).toContain("No file uploaded");
  });

  it("should reject if the uploaded file is not JSON", async () => {
    const res = await request(app)
      .post("/upload")
      .attach("chatExport", Buffer.from("this is not json"), {
        filename: "test.txt",
        contentType: "text/plain",
      });
    expect(res.statusCode).toEqual(400);
    expect(res.text).toContain(
      "Invalid file type. Only JSON files are allowed."
    );
  });

  it("should process a valid JSON file and show chat selection", async () => {
    fs.readFile.mockResolvedValue(sampleClaudeExportString);

    const res = await request(app)
      .post("/upload")
      .attach("chatExport", Buffer.from(sampleClaudeExportString), {
        filename: "claude_export.json",
        contentType: "application/json",
      });

    expect(res.statusCode).toEqual(200);
    expect(fs.readFile).toHaveBeenCalledWith(expect.any(String), "utf-8");
    expect(res.text).toContain("<h1>Select Chats to Include</h1>");
    expect(res.text).toContain("Chat 1");
    expect(res.text).toContain('value="chat1"');
    expect(res.text).toContain("Chat 2");
    expect(res.text).toContain('value="chat2"');
    expect(fs.unlink).toHaveBeenCalledWith(expect.any(String));

    expect(global.uploadedChats["claude_export.json"]).toBeDefined();
    expect(global.uploadedChats["claude_export.json"].length).toBe(2);
  });

  it("should handle JSON parsing errors", async () => {
    fs.readFile.mockResolvedValue("this is not valid json");

    const res = await request(app)
      .post("/upload")
      .attach("chatExport", Buffer.from("this is not valid json"), {
        filename: "broken.json",
        contentType: "application/json",
      });

    expect(res.statusCode).toEqual(500);
    expect(res.text).toContain("Error processing uploaded file");
    expect(fs.unlink).toHaveBeenCalledWith(expect.any(String));
  });
});

describe("POST /generate-epub", () => {
  const originalFilename = "claude_export.json";
  const chatData = [
    {
      id: "chat1",
      title: "Chat 1",
      originalChatData: {
        name: "Chat 1",
        uuid: "chat1",
        chat_messages: [{ sender: "human", text: "Test" }],
      },
    },
    {
      id: "chat2",
      title: "Chat 2",
      originalChatData: {
        name: "Chat 2",
        uuid: "chat2",
        chat_messages: [{ sender: "assistant", text: "Reply" }],
      },
    },
  ];

  beforeEach(() => {
    global.uploadedChats[originalFilename] = chatData;
  });

  it("should require selectedChats and originalFilename", async () => {
    const res = await request(app).post("/generate-epub").send({});
    expect(res.statusCode).toEqual(400);
    expect(res.text).toContain("Missing selection or filename");
  });

  it("should return 404 if chat data not found in global store", async () => {
    const res = await request(app)
      .post("/generate-epub")
      .send({ selectedChats: "chat1", originalFilename: "nonexistent.json" });
    expect(res.statusCode).toEqual(404);
    expect(res.text).toContain("Chat data not found");
  });

  it("should require at least one chat to be selected", async () => {
    const res = await request(app)
      .post("/generate-epub")
      .send({ selectedChats: [], originalFilename });
    expect(res.statusCode).toEqual(400);
    expect(res.text).toContain("No chats were selected");
  });

  it("should generate and download an EPUB for selected chats", async () => {
    const { MagazineGenerator: MockMagazineGenerator } = await import(
      "../src/magazineGenerator.js"
    );
    const { ContentManager: MockContentManager } = await import(
      "../src/contentManager.js"
    );

    const mockGenerateMagazine =
      MockMagazineGenerator.mock.results[0].value.generateMagazine;
    mockGenerateMagazine.mockResolvedValue(
      "path/to/generated/test_magazine.epub"
    );

    const mockAddChatHighlight =
      MockContentManager.mock.instances[0].addChatHighlight;

    const res = await request(app)
      .post("/generate-epub")
      .send({ selectedChats: "chat1", originalFilename });

    expect(res.statusCode).toEqual(200);
    expect(res.headers["content-disposition"]).toContain(
      'attachment; filename="test_magazine.epub"'
    );
    expect(res.headers["content-type"]).toEqual("application/epub+zip");

    expect(mockAddChatHighlight).toHaveBeenCalledTimes(1);
    expect(mockAddChatHighlight).toHaveBeenCalledWith(
      "Chat 1",
      expect.stringContaining("Human: Test"),
      expect.any(String),
      "Chat Exports"
    );
    expect(mockGenerateMagazine).toHaveBeenCalled();
    expect(fs.unlink).toHaveBeenCalledWith(
      "path/to/generated/test_magazine.epub"
    );
    expect(global.uploadedChats[originalFilename]).toBeUndefined();
  });

  it("should handle errors during EPUB generation", async () => {
    const { MagazineGenerator: MockMagazineGenerator } = await import(
      "../src/magazineGenerator.js"
    );
    const mockGenerateMagazine =
      MockMagazineGenerator.mock.results[0].value.generateMagazine;
    mockGenerateMagazine.mockRejectedValue(new Error("EPUB Gen Failed"));

    const res = await request(app)
      .post("/generate-epub")
      .send({ selectedChats: "chat1", originalFilename });

    expect(res.statusCode).toEqual(500);
    expect(res.text).toContain(
      "An unexpected error occurred while generating the EPUB"
    );
    expect(global.uploadedChats[originalFilename]).toBeUndefined();
  });
});
