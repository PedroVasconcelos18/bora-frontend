import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { compressEvidencePhoto } from '../lib/compressImage';
import { PrimaryButton } from './PrimaryButton';
import { EvidenceStatusBadge, type EvidenceStatus } from './EvidenceStatusBadge';
import { showToast } from './Toast';

const R2_PUBLIC_BASE_URL: string = import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '';

const GENERIC_UPLOAD_ERROR = 'Não deu pra enviar a foto. Confira sua conexão e tente de novo.';
const INVALID_TYPE_ERROR = 'Escolha uma foto (JPG, PNG ou WEBP).';

export interface TodayEvidence {
  objectKey: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

interface EvidenceUploadCardProps {
  challengeId: string;
  isPaid: boolean;
  todayEvidence: TodayEvidence | null | undefined;
  onUploaded: () => void;
}

function evidenceStatusToBadge(status: TodayEvidence['status']): EvidenceStatus {
  return status === 'PENDING' ? 'SENT' : status;
}

/** Best-effort extraction of a friendly pt-BR error message from a failed response. */
async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (typeof body.message === 'string') return body.message;
    if (Array.isArray(body.message) && res.status === 400) return INVALID_TYPE_ERROR;
  } catch {
    // no JSON body — fall through to fallback
  }
  return fallback;
}

/**
 * EvidenceUploadCard — the "Hoje" tab's evidence-upload flow (EVID-01/02).
 * Runs compress -> POST /evidences/presign -> PUT uploadUrl -> POST /evidences
 * against the Plan 01 two-step contract (upstream: local storage V1, byte-for-
 * byte same shape as a future R2 swap-back).
 */
export function EvidenceUploadCard({
  challengeId,
  isPaid,
  todayEvidence,
  onUploaded,
}: EvidenceUploadCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Posted-today state: thumbnail + status badge, no re-upload affordance.
  if (todayEvidence) {
    const thumbnailUrl = `${R2_PUBLIC_BASE_URL}/${encodeURIComponent(todayEvidence.objectKey)}`;
    return (
      <div style={cardShellStyle}>
        <div style={{ position: 'relative' }}>
          <img src={thumbnailUrl} alt="Evidência de hoje" style={thumbnailStyle} />
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <EvidenceStatusBadge status={evidenceStatusToBadge(todayEvidence.status)} />
          </div>
        </div>
        <p style={captionStyle}>Você já enviou a evidência de hoje.</p>
      </div>
    );
  }

  // Paid-gate blocked state.
  if (!isPaid) {
    return (
      <div style={cardShellStyle}>
        <div style={{ ...dropZoneStyle, opacity: 0.5, cursor: 'not-allowed' }}>
          <span style={{ fontSize: '2rem' }}>📸</span>
          <span style={dropZoneLabelStyle}>Enviar evidência de hoje</span>
          <span style={dropZoneHelperStyle}>Tire uma foto ou escolha da galeria</span>
        </div>
        <p style={errorTextStyle}>
          Sua entrada ainda não foi confirmada. Assim que o Pix cair, você pode postar.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMessage(null);

    try {
      const compressed = await compressEvidencePhoto(selectedFile);
      const contentType = compressed.type || 'image/jpeg';

      const presignRes = await apiClient.post('/evidences/presign', { challengeId, contentType });
      if (!presignRes.ok) {
        throw new Error(await extractErrorMessage(presignRes, GENERIC_UPLOAD_ERROR));
      }
      const { uploadUrl, objectKey } = (await presignRes.json()) as {
        uploadUrl: string;
        objectKey: string;
        expiresAt: string;
      };

      // D-03: direct-to-storage PUT, no bytes through NestJS. Content-Type
      // must byte-match the value the presign step signed (Pitfall 4).
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: compressed,
      });
      if (!putRes.ok) {
        throw new Error(await extractErrorMessage(putRes, GENERIC_UPLOAD_ERROR));
      }

      const confirmRes = await apiClient.post('/evidences', { challengeId, objectKey });
      if (!confirmRes.ok) {
        throw new Error(await extractErrorMessage(confirmRes, GENERIC_UPLOAD_ERROR));
      }

      showToast('Evidência enviada! Agora é com a turma votar.');
      setSelectedFile(null);
      setPreviewUrl(null);
      onUploaded();
    } catch (err) {
      const message = err instanceof Error ? err.message : GENERIC_UPLOAD_ERROR;
      setErrorMessage(message);
      showToast(message);
    } finally {
      setIsUploading(false);
    }
  };

  // Selected / compressing / uploading state.
  if (selectedFile && previewUrl) {
    return (
      <div style={cardShellStyle}>
        <img src={previewUrl} alt="Pré-visualização" style={thumbnailStyle} />
        <div style={{ marginTop: 12 }}>
          <PrimaryButton onClick={() => void handleUpload()} loading={isUploading}>
            Enviar evidência de hoje
          </PrimaryButton>
        </div>
        {errorMessage && <p style={errorTextStyle}>{errorMessage}</p>}
      </div>
    );
  }

  // Not-posted-paid state (default).
  return (
    <div style={cardShellStyle}>
      <label style={dropZoneStyle}>
        <span style={{ fontSize: '2rem' }}>📸</span>
        <span style={dropZoneLabelStyle}>Enviar evidência de hoje</span>
        <span style={dropZoneHelperStyle}>Tire uma foto ou escolha da galeria</span>
        <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
      </label>
      {errorMessage && <p style={errorTextStyle}>{errorMessage}</p>}
    </div>
  );
}

const cardShellStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--line)',
  borderRadius: 18,
  padding: 18,
};

const dropZoneStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  border: '2px dashed var(--mint-deep)',
  borderRadius: 16,
  minHeight: 160,
  cursor: 'pointer',
  textAlign: 'center',
  padding: 16,
};

const dropZoneLabelStyle: React.CSSProperties = {
  fontFamily: '"Baloo 2", system-ui, sans-serif',
  fontWeight: 700,
  fontSize: '1rem',
  color: 'var(--ink)',
};

const dropZoneHelperStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--muted)',
};

const thumbnailStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '4 / 3',
  objectFit: 'cover',
  borderRadius: 16,
  display: 'block',
};

const captionStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: '0.85rem',
  color: 'var(--muted)',
  fontWeight: 600,
};

const errorTextStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: '0.82rem',
  color: 'var(--coral)',
  fontWeight: 600,
};
