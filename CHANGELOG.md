# [2.0.0](https://github.com/connordibble/zod-ai-tool/compare/v1.1.0...v2.0.0) (2026-07-01)


* feat!: emit Gemini declarations as parametersJsonSchema ([084e562](https://github.com/connordibble/zod-ai-tool/commit/084e562c7bcf33e57ae1b625cda1bce0764a5f4a))


### Bug Fixes

* throw on open objects under OpenAI strict mode ([a3ab6a2](https://github.com/connordibble/zod-ai-tool/commit/a3ab6a204f8cfecf101e0548e4b0d4c079996966))


### BREAKING CHANGES

* GeminiFunctionDeclaration now exposes the schema as
parametersJsonSchema instead of parameters.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QKSuyniKW9pMQYvN7cQ3ii

# [1.1.0](https://github.com/connordibble/zod-ai-tool/compare/v1.0.0...v1.1.0) (2026-06-20)


### Features

* add OpenAI strict mode and Gemini declarations ([6299427](https://github.com/connordibble/zod-ai-tool/commit/6299427ab0f7c62b18a2561a08a37b65912eb3b4))

# 1.0.0 (2026-06-14)


### Bug Fixes

* align package compatibility metadata ([fb89510](https://github.com/connordibble/zod-ai-tool/commit/fb89510da3c18bf09b14f3d153a3a0bc31547647))
* make Responses tools SDK-compatible ([25a4162](https://github.com/connordibble/zod-ai-tool/commit/25a4162fea24e10f6f49b975f9b0dae8cfd11c45))
* publish package with public access ([4592bbf](https://github.com/connordibble/zod-ai-tool/commit/4592bbf8b56228edc907419628865686f9d66a8b))
* support Zod 4.0 JSON Schema targets ([fef93a1](https://github.com/connordibble/zod-ai-tool/commit/fef93a16967a5ca82c4708c4669fa444b00b3570))


### Features

* derive Anthropic and OpenAI tool definitions from a Zod schema ([388840d](https://github.com/connordibble/zod-ai-tool/commit/388840d1357d246b7467aca494fbcbd2cbd52cd1))
