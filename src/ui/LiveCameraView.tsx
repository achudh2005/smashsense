import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useSmashSenseStore } from '../game/gameState';
import { cameraManager, CameraResolution, RESOLUTION_PRESETS } from '../camera/cameraManager';
import { useWakeLock } from '../camera/useWakeLock';
import { PerformanceMeter } from '../camera/fpsMeter';
import { AdaptiveFrameSkipper } from '../detection/frameSkipper';
import { MultiPlayerTracker, PlayerRole } from '../tracking/byteTrack';
import { ShuttlecockTracker, drawShuttlecockTrail } from '../tracking/shuttlecockTracker';
import { drawCourtOverlay, drawCalibrationPins } from '../court/courtOverlay';
import { projectPoint } from '../court/homography';
import { TopBar } from './TopBar';
import { MobileBottomBar } from './MobileBottomBar';
import { MiniCourt } from './MiniCourt';
import { CalibrationOverlay } from './CalibrationOverlay';
import { SetupWizard } from './SetupWizard';
import { LandingCallBanner } from './LandingCallBanner';
import { PlayerActionFeed } from './PlayerActionFeed';
import { LiveStatsDrawer } from './LiveStatsDrawer';
import { StatsDashboardModal } from './StatsDashboardModal';
import { TrainingModeModal } from './TrainingModeModal';
import { LargeScoreboardModal } from './LargeScoreboardModal';
import { ReviewFlaggedCallsModal } from './ReviewFlaggedCallsModal';
import { PlayerProfilesModal } from './PlayerProfilesModal';
import { PrivacyModal } from './PrivacyModal';
import { OnboardingTutorial } from './OnboardingTutorial';
import { AutoDetectionHUD } from './AutoDetectionHUD';
import { TacticalCoachCard } from './TacticalCoachCard';
import { RemoteClickerSettingsModal } from './RemoteClickerSettingsModal';
import { HawkEyeReplayModal } from './HawkEyeReplayModal';
import { BroadcastGraphicsOverlay } from './BroadcastGraphicsOverlay';
import { BiomechanicsModal } from './BiomechanicsModal';
import { DualCameraModal } from './DualCameraModal';
import { UmpireTabletMode } from './UmpireTabletMode';
import { poseFrameRollingBuffer } from '../detection/biomechanicsAnalyzer';
import { remoteClickerService } from '../sensors/remoteClickerService';
import { generateTacticalAdvice } from '../tactical/tacticalSuggestionEngine';
import { calculateWinProbability } from '../tactical/winProbabilityEngine';
import { trainingManager } from '../training/trainingManager';
import { playerProfileService } from '../history/playerProfileService';
import { calculateMatchAnalysis } from '../stats/matchStatsCalculator';
import { CameraOff, Sparkles } from 'lucide-react';
import { WorkerInMessage, WorkerOutMessage } from '../detection/types';
import { db } from '../storage/db';
import { haptics } from '../utils/haptics';

export const LiveCameraView: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const trackerRef = useRef<MultiPlayerTracker>(new MultiPlayerTracker());
  const shuttleTrackerRef = useRef<ShuttlecockTracker>(new ShuttlecockTracker());
  const perfMeterRef = useRef<PerformanceMeter>(new PerformanceMeter());
  const frameSkipperRef = useRef<AdaptiveFrameSkipper>(new AdaptiveFrameSkipper(25));

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({ width: 1280, height: 720 });
  const [isMiniCourtExpanded, setIsMiniCourtExpanded] = useState(false);

  // Store bindings
  const facingMode = useSmashSenseStore((s) => s.facingMode);
  const resolution = useSmashSenseStore((s) => s.resolution);
  const selectedCameraId = useSmashSenseStore((s) => s.selectedCameraId);
  const setCameraSettings = useSmashSenseStore((s) => s.setCameraSettings);

  const isCalibrationMode = useSmashSenseStore((s) => s.isCalibrationMode);
  const screenCorners = useSmashSenseStore((s) => s.screenCorners);
  const courtToImageMatrix = useSmashSenseStore((s) => s.courtToImageMatrix);
  const imageToCourtMatrix = useSmashSenseStore((s) => s.imageToCourtMatrix);
  const showCourtOverlay = useSmashSenseStore((s) => s.showCourtOverlay);
  const showMiniCourt = useSmashSenseStore((s) => s.showMiniCourt);
  const showSkeleton = useSmashSenseStore((s) => s.showSkeleton);
  const isSimulationMode = useSmashSenseStore((s) => s.isSimulationMode);

  const setLiveDetections = useSmashSenseStore((s) => s.setLiveDetections);
  const setFpsStats = useSmashSenseStore((s) => s.setFpsStats);
  const setWakeLocked = useSmashSenseStore((s) => s.setWakeLocked);

  const rallyStateMachine = useSmashSenseStore((s) => s.rallyStateMachine);
  const handleCompletedRally = useSmashSenseStore((s) => s.handleCompletedRally);
  const addPlayerAction = useSmashSenseStore((s) => s.addPlayerAction);
  const activeLandingCall = useSmashSenseStore((s) => s.activeLandingCall);
  const dismissLandingCall = useSmashSenseStore((s) => s.dismissLandingCall);
  const recentPlayerActions = useSmashSenseStore((s) => s.recentPlayerActions);
  const config = useSmashSenseStore((s) => s.config);
  const snapshot = useSmashSenseStore((s) => s.snapshot);
  const completedRallies = useSmashSenseStore((s) => s.completedRallies);
  const allPlayerActions = useSmashSenseStore((s) => s.allPlayerActions);
  const isStatsModalOpen = useSmashSenseStore((s) => s.isStatsModalOpen);
  const setStatsModalOpen = useSmashSenseStore((s) => s.setStatsModalOpen);
  const isLiveStatsDrawerOpen = useSmashSenseStore((s) => s.isLiveStatsDrawerOpen);
  const setLiveStatsDrawerOpen = useSmashSenseStore((s) => s.setLiveStatsDrawerOpen);

  const isTrainingModalOpen = useSmashSenseStore((s) => s.isTrainingModalOpen);
  const setTrainingModalOpen = useSmashSenseStore((s) => s.setTrainingModalOpen);
  const isLargeScoreboardOpen = useSmashSenseStore((s) => s.isLargeScoreboardOpen);
  const setLargeScoreboardOpen = useSmashSenseStore((s) => s.setLargeScoreboardOpen);
  const isFlaggedCallsModalOpen = useSmashSenseStore((s) => s.isFlaggedCallsModalOpen);
  const setFlaggedCallsModalOpen = useSmashSenseStore((s) => s.setFlaggedCallsModalOpen);
  const isProfilesModalOpen = useSmashSenseStore((s) => s.isProfilesModalOpen);
  const setProfilesModalOpen = useSmashSenseStore((s) => s.setProfilesModalOpen);
  const isPrivacyModalOpen = useSmashSenseStore((s) => s.isPrivacyModalOpen);
  const setPrivacyModalOpen = useSmashSenseStore((s) => s.setPrivacyModalOpen);
  const isOnboardingOpen = useSmashSenseStore((s) => s.isOnboardingOpen);
  const setOnboardingOpen = useSmashSenseStore((s) => s.setOnboardingOpen);
  const isLowPowerMode = useSmashSenseStore((s) => s.isLowPowerMode);
  const awardPoint = useSmashSenseStore((s) => s.awardPoint);
  const undoScore = useSmashSenseStore((s) => s.undoScore);
  const startNextGame = useSmashSenseStore((s) => s.startNextGame);
  const setCalibrationMode = useSmashSenseStore((s) => s.setCalibrationMode);

  const detailedMatchEvents = useSmashSenseStore((s) => s.detailedMatchEvents);
  const isTacticalCoachOpen = useSmashSenseStore((s) => s.isTacticalCoachOpen);
  const setTacticalCoachOpen = useSmashSenseStore((s) => s.setTacticalCoachOpen);
  const isRemoteClickerSettingsOpen = useSmashSenseStore((s) => s.isRemoteClickerSettingsOpen);
  const setRemoteClickerSettingsOpen = useSmashSenseStore((s) => s.setRemoteClickerSettingsOpen);
  const isHawkEyeReplayOpen = useSmashSenseStore((s) => s.isHawkEyeReplayOpen);
  const hawkEyeReplayData = useSmashSenseStore((s) => s.hawkEyeReplayData);
  const setHawkEyeReplayOpen = useSmashSenseStore((s) => s.setHawkEyeReplayOpen);
  const isBiomechanicsModalOpen = useSmashSenseStore((s) => s.isBiomechanicsModalOpen);
  const biomechanicsReport = useSmashSenseStore((s) => s.biomechanicsReport);
  const setBiomechanicsModalOpen = useSmashSenseStore((s) => s.setBiomechanicsModalOpen);
  const activeBroadcastGraphic = useSmashSenseStore((s) => s.activeBroadcastGraphic);
  const setBroadcastGraphic = useSmashSenseStore((s) => s.setBroadcastGraphic);
  const isDualCameraModalOpen = useSmashSenseStore((s) => s.isDualCameraModalOpen);
  const setDualCameraModalOpen = useSmashSenseStore((s) => s.setDualCameraModalOpen);
  const isUmpireTabletModeOpen = useSmashSenseStore((s) => s.isUmpireTabletModeOpen);
  const setUmpireTabletModeOpen = useSmashSenseStore((s) => s.setUmpireTabletModeOpen);
  const toggleFlaggedCallsModal = useSmashSenseStore((s) => s.toggleFlaggedCallsModal);
  const toggleTrainingModal = useSmashSenseStore((s) => s.toggleTrainingModal);

  // Compute live match analytics report
  const matchAnalysis = useMemo(() => {
    const playerNamesMap: Record<PlayerRole, string> = {
      A1: config.teamANames.A1,
      A2: config.teamANames.A2 || 'Partner A',
      B1: config.teamBNames.B1,
      B2: config.teamBNames.B2 || 'Partner B',
    };
    return calculateMatchAnalysis(
      completedRallies,
      allPlayerActions,
      config.format,
      playerNamesMap
    );
  }, [completedRallies, allPlayerActions, config.format, config.teamANames, config.teamBNames]);

  const tacticalReport = useMemo(() => {
    const playerNamesMap: Record<PlayerRole, string> = {
      A1: config.teamANames.A1,
      A2: config.teamANames.A2 || 'Partner A',
      B1: config.teamBNames.B1,
      B2: config.teamBNames.B2 || 'Partner B',
    };
    return generateTacticalAdvice(detailedMatchEvents, snapshot, playerNamesMap, 'A');
  }, [detailedMatchEvents, snapshot, config]);

  const winProbability = useMemo(() => {
    const currentPlayers = useSmashSenseStore.getState().trackedPlayers;
    const pA = currentPlayers.find((p) => p.team === 'A');
    const pB = currentPlayers.find((p) => p.team === 'B');
    return calculateWinProbability(snapshot, detailedMatchEvents, pA?.speedKmh, pB?.speedKmh);
  }, [snapshot, detailedMatchEvents]);

  const matchAnalysisRef = useRef(matchAnalysis);
  matchAnalysisRef.current = matchAnalysis;
  const configRef = useRef(config);
  configRef.current = config;

  const { isLocked, isSupported, requestWakeLock, releaseWakeLock } = useWakeLock();

  useEffect(() => {
    setWakeLocked(isLocked);
  }, [isLocked, setWakeLocked]);

  useEffect(() => {
    frameSkipperRef.current.setTargetFps(isLowPowerMode ? 15 : 25);
  }, [isLowPowerMode]);

  useEffect(() => {
    if (isSupported) {
      requestWakeLock().catch(() => {});
    }
  }, [isSupported, requestWakeLock]);

  // Connect Bluetooth Remote Clicker events to match scoring & controls
  useEffect(() => {
    const unsubPointA = remoteClickerService.onAction('POINT_A', () => {
      awardPoint('A', 'Remote Clicker');
    });
    const unsubPointB = remoteClickerService.onAction('POINT_B', () => {
      awardPoint('B', 'Remote Clicker');
    });
    const unsubUndo = remoteClickerService.onAction('UNDO', () => {
      undoScore();
    });
    const unsubChallenge = remoteClickerService.onAction('CHALLENGE', () => {
      toggleFlaggedCallsModal();
    });
    const unsubDrill = remoteClickerService.onAction('TOGGLE_DRILL', () => {
      toggleTrainingModal();
    });

    return () => {
      unsubPointA();
      unsubPointB();
      unsubUndo();
      unsubChallenge();
      unsubDrill();
    };
  }, [awardPoint, undoScore, toggleFlaggedCallsModal, toggleTrainingModal]);

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/detection.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.postMessage({ type: 'INIT', useSimulation: isSimulationMode } as WorkerInMessage);

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      const msg = event.data;
      if (msg.type === 'FRAME_RESULT') {
        frameSkipperRef.current.markFrameCompleted(msg.processingTimeMs);

        const { inferenceFps, latencyMs } = perfMeterRef.current.recordInference(msg.processingTimeMs);
        const renderFps = perfMeterRef.current.tickRender();
        setFpsStats(renderFps, inferenceFps, latencyMs);

        // Map raw detections to court metric coords using inverse homography
        const mappedPlayers = msg.players.map((p) => {
          const footPx = p.footPosition || {
            x: p.bbox.x + p.bbox.width / 2,
            y: p.bbox.y + p.bbox.height,
          };
          const courtPos = projectPoint(imageToCourtMatrix, footPx);
          return {
            ...p,
            footPosition: courtPos,
          };
        });

        // Update Multi-player tracker
        const tracked = trackerRef.current.update(mappedPlayers);

        // Phase 3: Rolling Buffer of Pose Keypoints for Smash Biomechanics
        if (msg.players.length > 0 && msg.players[0].keypoints) {
          poseFrameRollingBuffer.pushFrame(msg.players[0].keypoints, 'A1');
        }

        // Auto-identify players based on court position and match config
        if (useSmashSenseStore.getState().isAutoDetectEnabled) {
          trackerRef.current.autoIdentifyPlayers(configRef.current);
          const identifiedCount = tracked.filter(t => t.assignedRole || t.identificationStatus === 'LOCKED').length;
          useSmashSenseStore.getState().setIdentifiedPlayersCount(identifiedCount);
        }

        // Handle Auto Court Detection telemetry from worker
        if (msg.detectedCourt && useSmashSenseStore.getState().isAutoDetectEnabled) {
          const currentStatus = useSmashSenseStore.getState().autoCourtStatus;
          const isNewlyLocked = msg.detectedCourt.isLocked && currentStatus !== 'LOCKED';

          useSmashSenseStore.getState().setAutoCourtState({
            status: msg.detectedCourt.status,
            confidence: msg.detectedCourt.confidence,
            message: msg.detectedCourt.message,
            corners: isNewlyLocked ? msg.detectedCourt.corners : undefined,
          });

          if (isNewlyLocked) {
            haptics.success();
          }
        }

        // Map shuttlecock candidate to court
        let shuttleCourtPos = null;
        if (msg.shuttlecock) {
          shuttleCourtPos = projectPoint(imageToCourtMatrix, msg.shuttlecock.pixel);
        }

        const shuttleTrack = shuttleTrackerRef.current.update(
          msg.shuttlecock ? msg.shuttlecock.pixel : null,
          shuttleCourtPos,
          msg.shuttlecock ? msg.shuttlecock.confidence : 0,
          msg.timestamp
        );

        setLiveDetections(tracked, shuttleTrack);

        // Run Rally State Machine & Motion Action Detection
        const result = rallyStateMachine.update(tracked, shuttleTrack, msg.timestamp);
        if (result.newAction) {
          addPlayerAction(result.newAction);
          // Persist player motion event to IndexedDB
          db.playerEvents.add(result.newAction).catch(console.warn);
        }

        if (result.completedRally) {
          handleCompletedRally(result.completedRally);
          // Persist rally record and actions to IndexedDB
          db.rallies.add(result.completedRally).catch(console.warn);
          if (result.completedRally.actions.length > 0) {
            db.playerEvents.bulkAdd(result.completedRally.actions).catch(console.warn);
          }

          // Training Mode live landing record
          if (shuttleCourtPos && trainingManager.getActiveDrill()) {
            trainingManager.recordShuttleLanding(shuttleCourtPos, shuttleTrack?.speedKmh || 0);
          }

          // Update player profiles if game/match ended
          const currentSnap = useSmashSenseStore.getState().snapshot;
          if (currentSnap.isGameOver) {
            const currentConfig = configRef.current;
            const teamAWon = currentSnap.matchWinner === 'A' || currentSnap.scoreA > currentSnap.scoreB;
            const winners = teamAWon ? [currentConfig.teamANames.A1] : [currentConfig.teamBNames.B1];
            const losers = teamAWon ? [currentConfig.teamBNames.B1] : [currentConfig.teamANames.A1];
            playerProfileService.recordMatchCompletion(winners, losers, matchAnalysisRef.current).catch(console.warn);
          }
        }
      }
    };

    return () => {
      worker.terminate();
    };
  }, [imageToCourtMatrix, setLiveDetections, setFpsStats, isSimulationMode, rallyStateMachine, handleCompletedRally, addPlayerAction]);

  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'INIT', useSimulation: isSimulationMode });
    }
  }, [isSimulationMode]);

  // Start Camera Stream
  const initCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await cameraManager.startStream(facingMode, resolution, selectedCameraId);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
    }
  }, [facingMode, resolution, selectedCameraId]);

  useEffect(() => {
    initCamera();
    return () => {
      cameraManager.stopStream();
    };
  }, [initCamera]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const vw = videoRef.current.videoWidth || RESOLUTION_PRESETS[resolution].width;
      const vh = videoRef.current.videoHeight || RESOLUTION_PRESETS[resolution].height;
      setVideoDims({ width: vw, height: vh });

      if (!offscreenCanvasRef.current) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = vw;
        offCanvas.height = vh;
        offscreenCanvasRef.current = offCanvas;
      } else {
        offscreenCanvasRef.current.width = vw;
        offscreenCanvasRef.current.height = vh;
      }
    }
  };

  // Main Animation & Detection Loop
  useEffect(() => {
    let animId: number;

    const renderLoop = (now: number) => {
      perfMeterRef.current.tickRender(now);

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const offCanvas = offscreenCanvasRef.current;
      const worker = workerRef.current;

      if (canvas && videoDims.width > 0 && videoDims.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 1. Draw Badminton Court Overlay
          if (showCourtOverlay) {
            drawCourtOverlay(ctx, courtToImageMatrix, {
              fillCourt: true,
              courtFillColor: 'rgba(21, 128, 61, 0.12)',
            });

            // If auto-detect is scanning court, draw dynamic futuristic laser sweep
            const autoCourtStatus = useSmashSenseStore.getState().autoCourtStatus;
            if (autoCourtStatus === 'SCANNING' && screenCorners.length === 4) {
              const scanPhase = (now % 1600) / 1600; // 0 to 1
              const [tl, tr, br, bl] = screenCorners;

              const leftX = tl.x + (bl.x - tl.x) * scanPhase;
              const leftY = tl.y + (bl.y - tl.y) * scanPhase;
              const rightX = tr.x + (br.x - tr.x) * scanPhase;
              const rightY = tr.y + (br.y - tr.y) * scanPhase;

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(leftX, leftY);
              ctx.lineTo(rightX, rightY);
              ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
              ctx.lineWidth = 2.5;
              ctx.shadowColor = '#38bdf8';
              ctx.shadowBlur = 10;
              ctx.stroke();
              ctx.restore();
            }
          }

          // 2. Draw Calibration Pins if in calibration mode
          if (isCalibrationMode) {
            drawCalibrationPins(ctx, screenCorners);
          }

          // 3. Draw Tracked Players with Broadcast Computer Vision Styling
          const tracked = useSmashSenseStore.getState().trackedPlayers;
          for (const player of tracked) {
            const isTeamA = player.team === 'A';
            const teamColor = isTeamA ? '#38bdf8' : '#f97316';
            const jerseyHex = player.jerseyColor?.hex || teamColor;
            const { x, y, width, height } = player.bbox;

            ctx.save();

            // (a) Ground contact footprint anchor (perspective oval)
            const footX = x + width / 2;
            const footY = y + height;
            ctx.beginPath();
            ctx.ellipse(footX, footY, width * 0.35, 7, 0, 0, Math.PI * 2);
            ctx.fillStyle = isTeamA ? 'rgba(56, 189, 248, 0.22)' : 'rgba(249, 115, 22, 0.22)';
            ctx.fill();
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // (b) Subtle translucent inner fill
            ctx.fillStyle = isTeamA ? 'rgba(56, 189, 248, 0.04)' : 'rgba(249, 115, 22, 0.04)';
            ctx.fillRect(x, y, width, height);

            // (c) High-tech broadcast corner reticles
            const reticleLen = Math.max(10, Math.min(20, Math.min(width, height) * 0.22));
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Top-Left
            ctx.beginPath();
            ctx.moveTo(x, y + reticleLen);
            ctx.lineTo(x, y);
            ctx.lineTo(x + reticleLen, y);
            ctx.stroke();

            // Top-Right
            ctx.beginPath();
            ctx.moveTo(x + width - reticleLen, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width, y + reticleLen);
            ctx.stroke();

            // Bottom-Right
            ctx.beginPath();
            ctx.moveTo(x + width, y + height - reticleLen);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x + width - reticleLen, y + height);
            ctx.stroke();

            // Bottom-Left
            ctx.beginPath();
            ctx.moveTo(x + reticleLen, y + height);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x, y + height - reticleLen);
            ctx.stroke();

            // (d) Professional Header Pill Badge
            const role = player.assignedRole || (isTeamA ? 'A1' : 'B1');
            const playerName = player.customName ? ` ${player.customName}` : '';
            const speedText = player.speedKmh ? ` • ${Math.round(player.speedKmh)} km/h` : '';
            const badgeText = `${role}${playerName}${speedText}`;

            ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
            const textW = ctx.measureText(badgeText).width;
            const pillW = textW + 28;
            const pillH = 22;
            const pillX = x;
            const pillY = y - pillH - 4;

            // Background glass card
            ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
            ctx.beginPath();
            ctx.roundRect(pillX, pillY, pillW, pillH, 6);
            ctx.fill();
            ctx.strokeStyle = teamColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Jersey Color Swatch Dot
            ctx.beginPath();
            ctx.arc(pillX + 10, pillY + pillH / 2, 4, 0, Math.PI * 2);
            ctx.fillStyle = jerseyHex;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Player Name & Role Text
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(badgeText, pillX + 20, pillY + 15);

            // (e) Keypoint Skeleton
            if (showSkeleton && player.keypoints) {
              for (const kp of player.keypoints) {
                if (kp.score > 0.5) {
                  ctx.beginPath();
                  ctx.arc(kp.x, kp.y, 3, 0, Math.PI * 2);
                  ctx.fillStyle = '#ffffff';
                  ctx.fill();
                  ctx.strokeStyle = teamColor;
                  ctx.lineWidth = 1.5;
                  ctx.stroke();
                }
              }
            }
            ctx.restore();
          }

          // 4. Draw Shuttlecock Comet Trail
          const shuttleTrack = useSmashSenseStore.getState().shuttleTrack;
          if (shuttleTrack) {
            drawShuttlecockTrail(ctx, shuttleTrack);
          }

          // 5. Draw Animated Landing Spot Highlight if active
          const landingCall = useSmashSenseStore.getState().activeLandingCall;
          if (landingCall) {
            const courtPt = landingCall.call.landingCourt;
            const screenPt = projectPoint(courtToImageMatrix, courtPt);
            const isCallIn = landingCall.call.call === 'IN';
            const rippleColor = isCallIn ? '#10b981' : '#f43f5e';

            // Expanding ripple animation
            const timePhase = (now % 1000) / 1000;
            const radius = 8 + timePhase * 24;
            const alpha = 1 - timePhase;

            ctx.save();
            // Outer ripple ring
            ctx.beginPath();
            ctx.arc(screenPt.x, screenPt.y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = rippleColor;
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = alpha;
            ctx.stroke();

            // Inner solid bullseye
            ctx.beginPath();
            ctx.arc(screenPt.x, screenPt.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = rippleColor;
            ctx.globalAlpha = 0.95;
            ctx.shadowColor = rippleColor;
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // Check if we should dispatch next frame to worker
      if (
        worker &&
        frameSkipperRef.current.shouldProcessNextFrame(now) &&
        (isSimulationMode || (video && video.readyState >= 2 && offCanvas))
      ) {
        frameSkipperRef.current.markFrameDispatched(now);

        let imgData: ImageData | undefined;
        if (!isSimulationMode && offCanvas && video) {
          const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
          if (offCtx) {
            offCtx.drawImage(video, 0, 0, offCanvas.width, offCanvas.height);
            imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          }
        }

        const msg: WorkerInMessage = {
          type: 'PROCESS_FRAME',
          imageData: imgData,
          width: videoDims.width,
          height: videoDims.height,
          timestamp: now,
          courtPolygon: screenCorners,
        };

        worker.postMessage(msg);
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [
    courtToImageMatrix,
    screenCorners,
    showCourtOverlay,
    isCalibrationMode,
    showSkeleton,
    isSimulationMode,
    videoDims,
  ]);

  const handleSwitchCamera = () => {
    setCameraSettings({
      facingMode: facingMode === 'environment' ? 'user' : 'environment',
    });
  };

  const handleSelectResolution = (newRes: CameraResolution) => {
    setCameraSettings({ resolution: newRes });
  };

  const handleToggleWakeLock = async () => {
    if (isLocked) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  };

  const handleReScan = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET_AUTO_DETECT' });
    }
    trackerRef.current.reset();
    useSmashSenseStore.getState().setAutoCourtState({
      status: 'SCANNING',
      confidence: 0,
      message: 'Scanning court & players...',
    });
    haptics.medium();
  }, []);

  const handleSwapSides = useCallback(() => {
    trackerRef.current.swapSides(configRef.current);
    const updated = trackerRef.current.update([]);
    useSmashSenseStore.getState().setLiveDetections(updated, useSmashSenseStore.getState().shuttleTrack);
    haptics.light();
  }, []);

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden flex flex-col">
      {/* Top Bar HUD */}
      <TopBar
        onSwitchCamera={handleSwitchCamera}
        onSelectResolution={handleSelectResolution}
        onToggleWakeLock={handleToggleWakeLock}
        wakeLockActive={isLocked}
        wakeLockSupported={isSupported}
      />

      {/* Main Video & Canvas Container */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Raw Video Feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          onLoadedMetadata={handleVideoLoadedMetadata}
          className="absolute w-full h-full object-contain"
        />

        {/* Real-time WebGL / Canvas Overlay */}
        <canvas
          ref={canvasRef}
          width={videoDims.width}
          height={videoDims.height}
          className="absolute w-full h-full object-contain pointer-events-none"
        />

        {/* Auto-Detection Status & Intelligence HUD */}
        <AutoDetectionHUD
          onReScan={handleReScan}
          onFineTune={() => setCalibrationMode(true)}
          onSwapSides={handleSwapSides}
        />

        {/* Interactive Calibration Overlay Layer */}
        {isCalibrationMode && (
          <CalibrationOverlay
            videoWidth={videoDims.width}
            videoHeight={videoDims.height}
          />
        )}

        {/* Real-Time IN / OUT Line Call Banner */}
        {activeLandingCall && (
          <LandingCallBanner
            call={activeLandingCall.call}
            pointType={activeLandingCall.pointType}
            endingStroke={activeLandingCall.endingStroke}
            maxSpeedKmh={activeLandingCall.maxSpeedKmh}
            winningTeam={activeLandingCall.winningTeam}
            teamAName={config.teamANames.A1}
            teamBName={config.teamBNames.B1}
            onDismiss={dismissLandingCall}
          />
        )}

        {/* Live Player Action Feed in bottom-left */}
        <PlayerActionFeed actions={recentPlayerActions} />

        {/* Tactical AI Coach & Live Win Probability Card */}
        {isTacticalCoachOpen && (
          <div className="absolute top-28 right-4 z-30 pointer-events-auto max-w-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <TacticalCoachCard
              report={tacticalReport}
              winProb={winProbability}
              teamAName={config.teamANames.A1}
              teamBName={config.teamBNames.B1}
              onDismiss={() => setTacticalCoachOpen(false)}
            />
          </div>
        )}

        {/* Simulated Match Banner if active */}
        {isSimulationMode && (
          <div className="absolute top-16 left-4 z-20 bg-purple-950/80 border border-purple-500/50 rounded-xl px-3 py-1.5 flex items-center gap-2 backdrop-blur-md text-purple-200 text-xs shadow-xl">
            <Sparkles size={14} className="text-purple-400 animate-spin" />
            <span>Simulated Match Mode Active (Rally State Machine & Auto-Scoring)</span>
          </div>
        )}

        {/* Camera Error Message */}
        {cameraError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
            <CameraOff className="w-16 h-16 text-red-400 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Camera Access Required</h3>
            <p className="text-sm text-slate-300 max-w-md mb-4">{cameraError}</p>
            <div className="flex gap-3">
              <button
                onClick={initCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold"
              >
                Retry Camera
              </button>
              <button
                onClick={() => useSmashSenseStore.getState().setSimulationMode(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
              >
                <Sparkles size={15} />
                Try Simulation Mode
              </button>
            </div>
          </div>
        )}

        {/* Docked Top-Down 2D Mini-Court Radar */}
        {showMiniCourt && (
          <div className="absolute bottom-20 md:bottom-4 right-4 z-20">
            <MiniCourt
              isExpanded={isMiniCourtExpanded}
              onToggleExpand={() => setIsMiniCourtExpanded(!isMiniCourtExpanded)}
            />
          </div>
        )}

        {/* Mobile Navigation Bar */}
        <MobileBottomBar
          onOpenScore={() => setLargeScoreboardOpen(true)}
          onOpenStats={() => setStatsModalOpen(true)}
          onOpenDrills={() => setTrainingModalOpen(true)}
          onToggleCalibration={() => setCalibrationMode(!isCalibrationMode)}
          isCalibrationActive={isCalibrationMode}
          onOpenCommandPalette={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
          }}
        />
      </div>

      {/* Match Setup Wizard Modal */}
      <SetupWizard />

      {/* Dockable Live Match Analytics Drawer */}
      <LiveStatsDrawer
        isOpen={isLiveStatsDrawerOpen}
        onClose={() => setLiveStatsDrawerOpen(false)}
        onOpenFullReport={() => {
          setLiveStatsDrawerOpen(false);
          setStatsModalOpen(true);
        }}
        report={matchAnalysis}
        teamAName={config.teamANames.A1}
        teamBName={config.teamBNames.B1}
        isDoubles={config.format === 'doubles'}
      />

      {/* Full Post-Match Analytics Dashboard Modal */}
      <StatsDashboardModal
        isOpen={isStatsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        report={matchAnalysis}
        rallies={completedRallies}
        teamAName={config.teamANames.A1}
        teamBName={config.teamBNames.B1}
        finalScoreText={`Game ${snapshot.gameIndex}: ${snapshot.scoreA} - ${snapshot.scoreB}`}
        isDoubles={config.format === 'doubles'}
      />

      {/* Solo Training & Drills Modal */}
      <TrainingModeModal
        isOpen={isTrainingModalOpen}
        onClose={() => setTrainingModalOpen(false)}
      />

      {/* Jumbo Court Scoreboard Display */}
      <LargeScoreboardModal
        isOpen={isLargeScoreboardOpen}
        onClose={() => setLargeScoreboardOpen(false)}
        snapshot={snapshot}
        teamAName={config.teamANames.A1}
        teamBName={config.teamBNames.B1}
        onAwardPoint={awardPoint}
        onUndo={undoScore}
        onStartNextGame={startNextGame}
      />

      {/* Line Accuracy & Flagged Calls Review Modal */}
      <ReviewFlaggedCallsModal
        isOpen={isFlaggedCallsModalOpen}
        onClose={() => setFlaggedCallsModalOpen(false)}
      />

      {/* Player Career Profiles & Head-to-Head Records */}
      <PlayerProfilesModal
        isOpen={isProfilesModalOpen}
        onClose={() => setProfilesModalOpen(false)}
      />

      {/* Privacy Guarantee Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
      />

      {/* Bluetooth Remote Clicker & Acoustic Sensor Modal */}
      <RemoteClickerSettingsModal
        isOpen={isRemoteClickerSettingsOpen}
        onClose={() => setRemoteClickerSettingsOpen(false)}
      />

      {/* Olympic-Style Broadcast Lower-Thirds Overlay */}
      <BroadcastGraphicsOverlay
        currentGraphic={activeBroadcastGraphic}
        onDismiss={() => setBroadcastGraphic(null)}
      />

      {/* Virtual 3D Hawk-Eye Replay Modal */}
      <HawkEyeReplayModal
        isOpen={isHawkEyeReplayOpen}
        onClose={() => setHawkEyeReplayOpen(false)}
        replayData={hawkEyeReplayData}
      />

      {/* Slow-Motion Smash Biomechanics Modal */}
      <BiomechanicsModal
        isOpen={isBiomechanicsModalOpen}
        onClose={() => setBiomechanicsModalOpen(false)}
        report={biomechanicsReport}
      />

      {/* Dual-Phone Wireless WebRTC Hawk-Eye Modal */}
      <DualCameraModal
        isOpen={isDualCameraModalOpen}
        onClose={() => setDualCameraModalOpen(false)}
      />

      {/* Referee & Umpire Tablet Mode Overlay */}
      <UmpireTabletMode
        isOpen={isUmpireTabletModeOpen}
        onClose={() => setUmpireTabletModeOpen(false)}
      />

      {/* Interactive Quickstart Onboarding Tour */}
      <OnboardingTutorial
        isOpen={isOnboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        onStartCalibration={() => setCalibrationMode(true)}
      />
    </div>
  );
};
