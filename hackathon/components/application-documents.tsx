import { recordDocumentReviewAction } from "@/app/applications/actions";
import { StatusPill } from "@/components/status-pill";
import { summarizeDocumentPacket } from "@/lib/document-intelligence";
import type { ApplicationDocument } from "@/lib/types";
import { formatToken } from "@/lib/utils";

export function ApplicationDocuments({
  documents,
}: {
  documents: ApplicationDocument[];
}) {
  const summary = summarizeDocumentPacket(documents);

  return (
    <section className="content-card">
      <p className="kicker">Supporting documents</p>
      <h2 className="section-title">OCR extraction and verification</h2>
      {documents.length > 0 ? (
        <p className="meta-text">
          {summary.totalDocuments} files · Verified {summary.verifiedDocuments} · Review {summary.reviewDocuments} · Rejected {summary.rejectedDocuments} · Avg OCR {summary.averageConfidence}%
        </p>
      ) : null}
      {documents.length === 0 ? (
        <p className="card-copy">No supporting documents are attached to this file yet.</p>
      ) : (
        <div className="document-list">
          {documents.map((document) => (
            <article className="alert-card" key={document.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">{document.fileName}</h3>
                  <p className="card-copy">{document.analysisSummary}</p>
                </div>
                <StatusPill value={document.verificationStatus} />
              </div>
              <p className="meta-text">
                {formatToken(document.documentType)} · OCR confidence {Math.round(document.extractedConfidence * 100)}%
              </p>
              <p className="meta-text">
                {document.mimeType} · {(document.sizeBytes / 1024).toFixed(0)} KB
              </p>
              <ul className="meta-list">
                {Object.entries(document.extractedData).map(([key, value]) => (
                  <li key={key}>
                    {formatToken(key)}: {String(value)}
                  </li>
                ))}
              </ul>
              <form action={recordDocumentReviewAction} className="action-row">
                <input type="hidden" name="applicationId" value={document.applicationId} />
                <input type="hidden" name="documentId" value={document.id} />
                <button className="button-link secondary" type="submit" name="status" value="verified">
                  Mark verified
                </button>
                <button className="button-link secondary" type="submit" name="status" value="review">
                  Keep in review
                </button>
                <button className="button-link secondary" type="submit" name="status" value="rejected">
                  Reject
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
