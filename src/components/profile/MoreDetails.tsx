import type { RoleRecord, Method } from '../../data/types';
import { formatDate, formatScore } from '../../domain/format';
import { TOOLTIPS } from '../../config/constants';
import { InfoTooltip } from '../common/InfoTooltip';
import { Value } from './Metrics';
export function MoreDetails({ record, method }: { record: RoleRecord; method: Method }) {
  const other = method === 'B' ? 'C' : 'B',
    difference =
      record.methods.C.master === null || record.methods.B.master === null
        ? null
        : record.methods.C.master - record.methods.B.master,
    rankDiff = record.methods.C.rankDiffVsB;
  return (
    <details className="card more-details">
      <summary>
        More Details <span>Evidence, method differences & source</span>
      </summary>
      <div className="details-body">
        <dl className="detail-list">
          <div>
            <dt>
              Effective sample size{' '}
              <InfoTooltip text={TOOLTIPS.ess} label="About effective sample size" />
            </dt>
            <dd>
              <Value value={record.effectiveSampleSize} />
            </dd>
          </div>
          <div>
            <dt>Most recent match</dt>
            <dd>{formatDate(record.lastMatchDate)}</dd>
          </div>
          <div>
            <dt>First match</dt>
            <dd>{formatDate(record.firstMatchDate)}</dd>
          </div>
          <div>
            <dt>Recency-weighted average</dt>
            <dd>
              <Value value={record.recencyWeightedAvg} />
            </dd>
          </div>
          <div>
            <dt>Option C − Option B score</dt>
            <dd>
              {difference === null ? '—' : `${difference > 0 ? '+' : ''}${formatScore(difference)}`}
            </dd>
          </div>
          <div>
            <dt>Rank under Option {other}</dt>
            <dd>{record.methods[other].rankDisplay}</dd>
          </div>
          <div>
            <dt>Rank change under Option C</dt>
            <dd>
              {rankDiff === null || rankDiff === undefined
                ? '—'
                : rankDiff === 0
                  ? 'Same rank'
                  : `${rankDiff > 0 ? '▲' : '▼'} ${Math.abs(rankDiff)} places ${rankDiff > 0 ? 'higher' : 'lower'} than Option B`}
            </dd>
          </div>
          {method === 'C' && (
            <>
              <div>
                <dt>Consistency penalty</dt>
                <dd>
                  <Value value={record.methods.C.consistencyPenalty ?? null} />
                </dd>
              </div>
              <div>
                <dt>Weighted standard deviation</dt>
                <dd>
                  <Value value={record.methods.C.weightedSd ?? null} />
                </dd>
              </div>
            </>
          )}
          <div>
            <dt>Role benchmark</dt>
            <dd>
              <Value value={record.benchmark} />
            </dd>
          </div>
          <div>
            <dt>Supporting observations</dt>
            <dd>
              Realtime {record.supporting.realtimeN} · Individual {record.supporting.individualN}
            </dd>
          </div>
        </dl>
        <p className="source-line">
          <strong>Data source</strong>
          {record.source.workbook} › {method === 'B' ? record.source.sheetB : record.source.sheetC}{' '}
          › Excel row {method === 'B' ? record.source.rowB : record.source.rowC}
        </p>
      </div>
    </details>
  );
}
