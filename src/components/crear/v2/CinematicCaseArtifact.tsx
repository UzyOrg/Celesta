import type {
  CrearCaseArtifact,
  CrearVisualCue,
} from '@/lib/crear/types';
import styles from './CinematicEnglishPlayer.hallmark.module.css';

interface CinematicCaseArtifactProps {
  artifact: CrearCaseArtifact;
  cue?: CrearVisualCue;
  compact?: boolean;
}

function PosterArtifact() {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Cartel de la feria con pintura fresca">
      <path className={styles.artifactDesk} d="M20 126h280" />
      <g className={styles.artifactSheet} transform="rotate(-2 158 76)">
        <rect x="76" y="22" width="166" height="104" rx="4" />
        <path d="M98 48h88M98 63h120M98 104h62" />
        <path className={styles.artifactPaint} d="M95 82c31-16 63 11 93-4 17-8 31-8 45-1" />
        <circle className={styles.artifactPaintDrop} cx="205" cy="94" r="5" />
      </g>
      <path className={styles.artifactTool} d="M44 113l46-42 8 8-43 46z" />
      <circle className={styles.artifactCuePaint} cx="205" cy="94" r="16" />
      <g className={styles.artifactCuePresence}>
        <circle cx="275" cy="42" r="18" />
        <path d="M275 32v11l8 5" />
      </g>
      <g className={styles.artifactCueLocation}>
        <path d="M42 36c0-10 8-18 18-18s18 8 18 18c0 14-18 31-18 31S42 50 42 36z" />
        <circle cx="60" cy="36" r="5" />
      </g>
    </svg>
  );
}

function ModelArtifact() {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Maqueta escolar sobre una mesa">
      <path className={styles.artifactDesk} d="M20 126h280" />
      <path className={styles.artifactModelBase} d="M66 113l91-31 101 29-95 22z" />
      <path className={styles.artifactModelWall} d="M111 88V38l52 17v58z" />
      <path className={styles.artifactModelWall} d="M163 55l51-18v51l-51 25z" />
      <path className={styles.artifactModelLine} d="M127 53l22 7v20l-22-7zM181 57l20-7v21l-20 8z" />
      <path className={styles.artifactGlue} d="M91 108c20 7 35 8 51 5" />
      <circle className={styles.artifactCueGlue} cx="112" cy="111" r="18" />
      <g className={styles.artifactCuePresence}>
        <circle cx="272" cy="42" r="18" />
        <path d="M272 32v11l8 5" />
      </g>
      <g className={styles.artifactCueLocation}>
        <path d="M40 37c0-10 8-18 18-18s18 8 18 18c0 14-18 31-18 31S40 51 40 37z" />
        <circle cx="58" cy="37" r="5" />
      </g>
    </svg>
  );
}

function TripArtifact() {
  return (
    <svg viewBox="0 0 320 150" role="img" aria-label="Ruta de excursión lejos de la escuela">
      <path className={styles.artifactRoute} d="M46 105c41-55 74 20 116-28 33-38 65-14 105-47" />
      <g className={styles.artifactSchool}>
        <path d="M35 80l34-23 34 23v39H35z" />
        <path d="M29 80h80M57 94h24v25" />
      </g>
      <g className={styles.artifactBus}>
        <rect x="206" y="37" width="69" height="42" rx="8" />
        <path d="M219 47h17v13h-17zM242 47h19v13h-19z" />
        <circle cx="221" cy="81" r="7" />
        <circle cx="260" cy="81" r="7" />
      </g>
      <circle className={styles.artifactCueTrip} cx="240" cy="60" r="31" />
    </svg>
  );
}

export function CinematicCaseArtifact({
  artifact,
  cue = artifact.cue,
  compact = false,
}: CinematicCaseArtifactProps) {
  return (
    <figure
      className={styles.caseArtifact}
      data-compact={compact ? 'true' : 'false'}
      data-kind={artifact.kind}
      data-cue={cue?.kind}
      aria-label={`${artifact.label}. ${cue?.detail ?? artifact.status}`}
    >
      <div className={styles.caseArtifactCanvas} aria-hidden="true">
        {artifact.kind === 'poster' ? <PosterArtifact /> : null}
        {artifact.kind === 'model' ? <ModelArtifact /> : null}
        {artifact.kind === 'trip' ? <TripArtifact /> : null}
      </div>
      <figcaption className={styles.artifactCaption}>
        <span>
          <strong>{artifact.label}</strong>
          <small>{artifact.status}</small>
        </span>
        {cue ? (
          <span className={styles.artifactCueCopy} aria-live="polite">
            <strong>{cue.label}</strong>
            <small>{cue.detail}</small>
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
