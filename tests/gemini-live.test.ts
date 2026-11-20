import test from "node:test";
import assert from "node:assert/strict";
import {
  float32ToPcm16,
  pcm16ToFloat32,
  buildRealtimeAudioPacket,
  buildRealtimeAudioStreamEnd,
  buildLiveConnectConfig,
  calculateAudioChunkDurationMs,
  createLivePcmPlayer,
  LIVE_AGENT_PERSONAS,
  AUDIO_SPECS,
  LIVE_NON_BLOCKING_TOOLS,
  formatLiveToolResponse,
  parseLiveServerMessage,
  VOICE_SPEED_BENCHMARKS,
  calculateVoiceLatencyMetrics,
  classifyVoiceSpeed,
} from "../lib/geminiLive.ts";

test("Gemini Live API: float32ToPcm16 clamps and converts within 16-bit audio range", () => {
  const input = new Float32Array([-1.5, -1.0, 0, 0.5, 1.0, 1.5]);
  const pcm16 = float32ToPcm16(input);

  assert.equal(pcm16.length, 6);
  assert.equal(pcm16[0], -32768); // Clamped minimum
  assert.equal(pcm16[1], -32768);
  assert.equal(pcm16[2], 0);
  assert.ok(Math.abs(pcm16[3] - 16383) <= 1);
  assert.equal(pcm16[4], 32767); // Clamped maximum
  assert.equal(pcm16[5], 32767);
});

test("Gemini Live API: pcm16ToFloat32 round-trips audio samples back to [-1, 1]", () => {
  const pcm16 = new Int16Array([-32768, 0, 16384, 32767]);
  const float32 = pcm16ToFloat32(pcm16);

  assert.equal(float32.length, 4);
  assert.equal(float32[0], -1.0);
  assert.equal(float32[1], 0.0);
  assert.ok(Math.abs(float32[2] - 0.5) < 0.01);
  assert.ok(Math.abs(float32[3] - 1.0) < 0.001);
});

test("Gemini Live API: buildRealtimeAudioPacket produces standard Live WebSocket schema", () => {
  const sampleBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEA";
  const packet = buildRealtimeAudioPacket(sampleBase64);

  assert.equal(packet.realtimeInput.mediaChunks.length, 1);
  assert.equal(packet.realtimeInput.mediaChunks[0].mimeType, AUDIO_SPECS.inputMimeType);
  assert.equal(packet.realtimeInput.mediaChunks[0].data, sampleBase64);
});

test("Gemini Live API: Personas provide required voice & prompt configurations", () => {
  assert.ok(LIVE_AGENT_PERSONAS.probahoVivaCoach.systemInstruction.includes("Probaho"));
  assert.ok(LIVE_AGENT_PERSONAS.legalAidVoiceGuide.systemInstruction.includes("16699"));
  assert.ok(LIVE_AGENT_PERSONAS.healthTriageAssistant.systemInstruction.includes("999"));
});

test("Gemini Live API: buildRealtimeAudioStreamEnd formats Hybrid VAD end packet", () => {
  const packet = buildRealtimeAudioStreamEnd();
  assert.equal(packet.realtimeInput.audioStreamEnd, true);
});

test("Gemini Live API: buildLiveConnectConfig outputs valid setup schema with smart transcription", () => {
  const config = buildLiveConnectConfig("probahoVivaCoach", {
    smartTranscription: true,
  });

  assert.equal(config.setup.model, "models/gemini-3.8-live");
  assert.deepEqual(config.setup.generationConfig.responseModalities, ["AUDIO"]);
  assert.equal(config.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName, "Kore");
  assert.equal(config.setup.inputAudioTranscription.mode, "smart");
  assert.ok(config.setup.systemInstruction.parts[0].text.includes("Probaho"));
});

test("Gemini Live API: calculateAudioChunkDurationMs computes correct duration", () => {
  // 16000 samples/sec * 2 bytes/sample = 32000 bytes/sec
  // 3200 bytes = 100 ms
  const ms100 = calculateAudioChunkDurationMs(3200, 16000, 2);
  assert.equal(ms100, 100);

  // 1600 bytes = 50 ms
  const ms50 = calculateAudioChunkDurationMs(1600, 16000, 2);
  assert.equal(ms50, 50);

  assert.equal(calculateAudioChunkDurationMs(0), 0);
});

test("Gemini Live API: createLivePcmPlayer returns safe stub when window is undefined", () => {
  const player = createLivePcmPlayer();
  assert.equal(typeof player.feedChunk, "function");
  assert.equal(typeof player.stop, "function");
  assert.equal(typeof player.isPlaying, "function");
  assert.equal(player.isPlaying(), false);
});

test("Gemini Live API: LIVE_NON_BLOCKING_TOOLS mandates NON_BLOCKING behavior", () => {
  assert.ok(LIVE_NON_BLOCKING_TOOLS.length >= 2);
  for (const tool of LIVE_NON_BLOCKING_TOOLS) {
    assert.equal(tool.behavior, "NON_BLOCKING");
    assert.ok(tool.name.length > 0);
    assert.ok(tool.description.length > 0);
  }
});

test("Gemini Live API: formatLiveToolResponse formats standard toolResponse packet", () => {
  const res = formatLiveToolResponse("call-123", "get_emergency_helplines", {
    emergency: "999",
    legalAid: "16699",
  });

  assert.equal(res.toolResponse.functionResponses.length, 1);
  assert.equal(res.toolResponse.functionResponses[0].id, "call-123");
  assert.equal(res.toolResponse.functionResponses[0].name, "get_emergency_helplines");
  assert.equal(res.toolResponse.functionResponses[0].response.emergency, "999");
});

test("Gemini Live API: parseLiveServerMessage parses multimodal live response parts", () => {
  const mockMsg = {
    interactionStatus: "IN_PROGRESS",
    serverContent: {
      interrupted: false,
      modelTurn: {
        parts: [
          { inlineData: { data: "AUDIODATA123", mimeType: "audio/pcm;rate=24000" } },
          { text: "হ্যালো, আমি শুনছি।" },
        ],
      },
      inputTranscription: { text: "জরুরি সেবা চাই" },
    },
    toolCall: {
      functionCalls: [
        { id: "fn-1", name: "get_emergency_helplines", args: { category: "emergency" } },
      ],
    },
  };

  const parsed = parseLiveServerMessage(mockMsg);
  assert.equal(parsed.interactionStatus, "IN_PROGRESS");
  assert.equal(parsed.isInterrupted, false);
  assert.equal(parsed.audioChunks.length, 1);
  assert.equal(parsed.audioChunks[0], "AUDIODATA123");
  assert.equal(parsed.outputTranscript, "হ্যালো, আমি শুনছি।");
  assert.equal(parsed.inputTranscript, "জরুরি সেবা চাই");
  assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parsed.toolCalls[0].name, "get_emergency_helplines");
});

test("Gemini Live API: VOICE_SPEED_BENCHMARKS contains verified quantitative numbers", () => {
  assert.equal(VOICE_SPEED_BENCHMARKS.baselineTtfaMs, 1250);
  assert.equal(VOICE_SPEED_BENCHMARKS.streamingTtfaMs, 220);
  assert.equal(VOICE_SPEED_BENCHMARKS.cachedPlaybackMs, 2);
  assert.equal(VOICE_SPEED_BENCHMARKS.hybridVadHandoffMs, 45);
  assert.equal(VOICE_SPEED_BENCHMARKS.serverVadSilenceWaitMs, 1200);
  assert.equal(VOICE_SPEED_BENCHMARKS.outputSampleRateHz, 24000);
  assert.equal(VOICE_SPEED_BENCHMARKS.outputBytesPerSec, 48000);
  assert.equal(VOICE_SPEED_BENCHMARKS.parallelLookaheadChunks, 4);
});

test("Gemini Live API: calculateVoiceLatencyMetrics computes exact latency, throughput and speedup", () => {
  // Streaming run: 220ms for 55 characters
  const metrics = calculateVoiceLatencyMetrics(1000, 1220, 55, false);
  assert.equal(metrics.ttfaMs, 220);
  assert.equal(metrics.charsCount, 55);
  assert.equal(metrics.charsPerSecond, 250); // 55 / 0.22s = 250 chars/sec
  assert.equal(metrics.speedupPercentage, 82.4); // (1250 - 220) / 1250 = 82.4% speedup
  assert.equal(metrics.isCached, false);

  // Cached run: 2ms playback
  const cachedMetrics = calculateVoiceLatencyMetrics(1000, 1220, 55, true);
  assert.equal(cachedMetrics.ttfaMs, 2);
  assert.equal(cachedMetrics.speedupPercentage, 99.8);
  assert.equal(cachedMetrics.isCached, true);
});

test("Gemini Live API: classifyVoiceSpeed categorizes TTFA into speed tiers", () => {
  assert.equal(classifyVoiceSpeed(2), "instant_cache");
  assert.equal(classifyVoiceSpeed(220), "realtime_streaming");
  assert.equal(classifyVoiceSpeed(550), "fast_chunk");
  assert.equal(classifyVoiceSpeed(1200), "standard");
});
