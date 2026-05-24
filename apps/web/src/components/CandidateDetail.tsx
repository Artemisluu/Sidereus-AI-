import type { Candidate, CandidateScore, CandidateStatus, ResumeStructured } from '@sidereus/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  fetchJobs,
  fetchCandidateScores,
  saveStructuredData,
  scoreCandidate,
  streamExtractCandidate,
  updateCandidateStatus,
} from '../api';
import { ScoreCharts } from './ScoreCharts';

interface Props {
  candidate: Candidate | null;
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
}

const statuses: Array<{ label: string; value: CandidateStatus }> = [
  { label: '待筛选', value: 'pending' },
  { label: '初筛通过', value: 'screened' },
  { label: '面试中', value: 'interview' },
  { label: '已录用', value: 'hired' },
  { label: '已淘汰', value: 'rejected' },
];

const extractStages: Array<{ key: keyof ResumeStructured; label: string }> = [
  { key: 'basicInfo', label: '基本信息' },
  { key: 'education', label: '教育背景' },
  { key: 'workExperience', label: '工作经历' },
  { key: 'skillTags', label: '技能标签' },
  { key: 'projects', label: '项目经历' },
];

function toExtractStageKey(value: string): keyof ResumeStructured | null {
  const normalized = value.trim();
  const matched = extractStages.find((item) => item.key === normalized);
  return matched?.key ?? null;
}

function extractStageLabel(key: keyof ResumeStructured | null): string {
  if (!key) {
    return '准备中';
  }
  return extractStages.find((item) => item.key === key)?.label ?? key;
}

function emptyStructured(): ResumeStructured {
  return {
    basicInfo: {
      name: '',
      phone: '',
      email: '',
      city: '',
    },
    education: [],
    workExperience: [],
    skillTags: [],
    projects: [],
  };
}

export function CandidateDetail({ candidate, selectedJobId, onSelectJob }: Props) {
  const queryClient = useQueryClient();
  const [structured, setStructured] = useState<ResumeStructured>(emptyStructured());
  const [displayedStructuredJson, setDisplayedStructuredJson] = useState(JSON.stringify(emptyStructured(), null, 2));
  const [isTypingStructured, setIsTypingStructured] = useState(false);
  const [streamStep, setStreamStep] = useState('');
  const [animatedStreamStep, setAnimatedStreamStep] = useState('');
  const [isTypingStreamStep, setIsTypingStreamStep] = useState(false);
  const [activeExtractStage, setActiveExtractStage] = useState<keyof ResumeStructured | null>(null);
  const [completedExtractStages, setCompletedExtractStages] = useState<Array<keyof ResumeStructured>>([]);
  const [justCompletedStage, setJustCompletedStage] = useState<keyof ResumeStructured | null>(null);
  const [manualJson, setManualJson] = useState('');
  const streamSourceRef = useRef<EventSource | null>(null);
  const streamStepIntervalRef = useRef<number | null>(null);
  const streamStepPauseRef = useRef<number | null>(null);
  const animatedStreamStepRef = useRef('');
  const structuredIntervalRef = useRef<number | null>(null);
  const structuredPauseRef = useRef<number | null>(null);
  const displayedStructuredRef = useRef(JSON.stringify(emptyStructured(), null, 2));
  const completedStageEffectRef = useRef<number | null>(null);

  useEffect(() => {
    if (!candidate) {
      return;
    }
    const nextStructured = candidate.structuredData ?? emptyStructured();
    const nextStructuredJson = JSON.stringify(nextStructured, null, 2);

    if (structuredIntervalRef.current !== null) {
      window.clearInterval(structuredIntervalRef.current);
      structuredIntervalRef.current = null;
    }
    if (structuredPauseRef.current !== null) {
      window.clearTimeout(structuredPauseRef.current);
      structuredPauseRef.current = null;
    }

    setStructured(nextStructured);
    displayedStructuredRef.current = nextStructuredJson;
    setDisplayedStructuredJson(nextStructuredJson);
    setIsTypingStructured(false);
    setStreamStep('');
    setActiveExtractStage(null);
    setCompletedExtractStages([]);
    setJustCompletedStage(null);
    setManualJson(JSON.stringify(nextStructured, null, 2));
  }, [candidate]);

  const structuredJson = useMemo(() => JSON.stringify(structured, null, 2), [structured]);

  useEffect(() => {
    if (structuredIntervalRef.current !== null) {
      window.clearInterval(structuredIntervalRef.current);
      structuredIntervalRef.current = null;
    }
    if (structuredPauseRef.current !== null) {
      window.clearTimeout(structuredPauseRef.current);
      structuredPauseRef.current = null;
    }

    if (!structuredJson) {
      displayedStructuredRef.current = '';
      setDisplayedStructuredJson('');
      setIsTypingStructured(false);
      return;
    }

    const currentText = displayedStructuredRef.current;
    const maxPrefixLength = Math.min(currentText.length, structuredJson.length);
    let prefixLength = 0;
    while (prefixLength < maxPrefixLength && currentText[prefixLength] === structuredJson[prefixLength]) {
      prefixLength += 1;
    }

    const stablePrefix = structuredJson.slice(0, prefixLength);
    displayedStructuredRef.current = stablePrefix;
    setDisplayedStructuredJson(stablePrefix);

    const remainingText = structuredJson.slice(prefixLength);
    setIsTypingStructured(true);

    if (!remainingText) {
      structuredPauseRef.current = window.setTimeout(() => {
        setIsTypingStructured(false);
        structuredPauseRef.current = null;
      }, 180);
      return;
    }

    let nextIndex = 0;
    const charsPerTick = 16;

    structuredIntervalRef.current = window.setInterval(() => {
      nextIndex = Math.min(nextIndex + charsPerTick, remainingText.length);
      const nextText = stablePrefix + remainingText.slice(0, nextIndex);
      displayedStructuredRef.current = nextText;
      setDisplayedStructuredJson(nextText);

      if (nextIndex >= remainingText.length && structuredIntervalRef.current !== null) {
        window.clearInterval(structuredIntervalRef.current);
        structuredIntervalRef.current = null;
        structuredPauseRef.current = window.setTimeout(() => {
          setIsTypingStructured(false);
          structuredPauseRef.current = null;
        }, 180);
      }
    }, 10);

    return () => {
      if (structuredIntervalRef.current !== null) {
        window.clearInterval(structuredIntervalRef.current);
        structuredIntervalRef.current = null;
      }
      if (structuredPauseRef.current !== null) {
        window.clearTimeout(structuredPauseRef.current);
        structuredPauseRef.current = null;
      }
    };
  }, [structuredJson]);

  useEffect(() => {
    if (streamStepIntervalRef.current !== null) {
      window.clearInterval(streamStepIntervalRef.current);
      streamStepIntervalRef.current = null;
    }
    if (streamStepPauseRef.current !== null) {
      window.clearTimeout(streamStepPauseRef.current);
      streamStepPauseRef.current = null;
    }

    if (!streamStep) {
      animatedStreamStepRef.current = '';
      setAnimatedStreamStep('');
      setIsTypingStreamStep(false);
      return;
    }

    const currentText = animatedStreamStepRef.current;
    const maxPrefixLength = Math.min(currentText.length, streamStep.length);
    let prefixLength = 0;
    while (prefixLength < maxPrefixLength && currentText[prefixLength] === streamStep[prefixLength]) {
      prefixLength += 1;
    }

    const stablePrefix = streamStep.slice(0, prefixLength);
    animatedStreamStepRef.current = stablePrefix;
    setAnimatedStreamStep(stablePrefix);

    const remainingText = streamStep.slice(prefixLength);
    setIsTypingStreamStep(true);

    if (!remainingText) {
      streamStepPauseRef.current = window.setTimeout(() => {
        setIsTypingStreamStep(false);
        streamStepPauseRef.current = null;
      }, 220);
      return;
    }

    let nextIndex = 0;

    streamStepIntervalRef.current = window.setInterval(() => {
      nextIndex += 1;
      const nextText = stablePrefix + remainingText.slice(0, nextIndex);
      animatedStreamStepRef.current = nextText;
      setAnimatedStreamStep(nextText);

      if (nextIndex >= remainingText.length && streamStepIntervalRef.current !== null) {
        window.clearInterval(streamStepIntervalRef.current);
        streamStepIntervalRef.current = null;
        streamStepPauseRef.current = window.setTimeout(() => {
          setIsTypingStreamStep(false);
          streamStepPauseRef.current = null;
        }, 220);
      }
    }, 24);

    return () => {
      if (streamStepIntervalRef.current !== null) {
        window.clearInterval(streamStepIntervalRef.current);
        streamStepIntervalRef.current = null;
      }
      if (streamStepPauseRef.current !== null) {
        window.clearTimeout(streamStepPauseRef.current);
        streamStepPauseRef.current = null;
      }
    };
  }, [streamStep]);

  useEffect(() => {
    return () => {
      streamSourceRef.current?.close();
      streamSourceRef.current = null;
      if (streamStepIntervalRef.current !== null) {
        window.clearInterval(streamStepIntervalRef.current);
        streamStepIntervalRef.current = null;
      }
      if (streamStepPauseRef.current !== null) {
        window.clearTimeout(streamStepPauseRef.current);
        streamStepPauseRef.current = null;
      }
      if (structuredIntervalRef.current !== null) {
        window.clearInterval(structuredIntervalRef.current);
        structuredIntervalRef.current = null;
      }
      if (structuredPauseRef.current !== null) {
        window.clearTimeout(structuredPauseRef.current);
        structuredPauseRef.current = null;
      }
      if (completedStageEffectRef.current !== null) {
        window.clearTimeout(completedStageEffectRef.current);
        completedStageEffectRef.current = null;
      }
    };
  }, []);

  const scoresQuery = useQuery({
    queryKey: ['candidate-scores', candidate?.id],
    queryFn: () => fetchCandidateScores(candidate!.id),
    enabled: Boolean(candidate),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CandidateStatus }) => updateCandidateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ResumeStructured }) => saveStructuredData(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      toast.success('保存成功');
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id, jobId }: { id: string; jobId: string }) => scoreCandidate(id, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['candidate-scores', candidate?.id] });
    },
  });

  const jobsQuery = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const selectedTitle = useMemo(
    () => jobsQuery.data?.find((job) => job.id === selectedJobId)?.title ?? '未选择',
    [jobsQuery.data, selectedJobId],
  );

  const latestScore = useMemo<CandidateScore | null>(() => {
    const first = scoresQuery.data?.[0];
    if (!first) {
      return null;
    }
    return {
      total: first.total,
      skill: first.skill,
      experience: first.experience,
      education: first.education,
      comment: first.comment,
    };
  }, [scoresQuery.data]);

  const totalScore = Math.min(Math.max(latestScore?.total ?? 0, 0), 100);
  const progressRadius = 44;
  const progressCircumference = 2 * Math.PI * progressRadius;
  const progressOffset = progressCircumference * (1 - totalScore / 100);
  const completedStageCount = completedExtractStages.length;
  const hasActiveStage = Boolean(activeExtractStage && !completedExtractStages.includes(activeExtractStage));
  const extractProgress = Math.min(
    100,
    ((completedStageCount + (hasActiveStage ? 0.5 : 0)) / extractStages.length) * 100,
  );

  if (!candidate) {
    return (
      <div className='rounded-xl border border-slate-200 bg-white p-4 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'>
        请选择候选人查看详情
      </div>
    );
  }

  const handleSseExtract = () => {
    streamSourceRef.current?.close();
    if (completedStageEffectRef.current !== null) {
      window.clearTimeout(completedStageEffectRef.current);
      completedStageEffectRef.current = null;
    }
    setCompletedExtractStages([]);
    setJustCompletedStage(null);
    setActiveExtractStage(null);
    setStreamStep('开始提取（准备中）...');
    const source = streamExtractCandidate(
      candidate.id,
      (chunk) => {
        setStructured((prev: ResumeStructured) => ({ ...prev, [chunk.key]: chunk.value }));
        const stageKey = toExtractStageKey(chunk.key);
        if (!stageKey) {
          return;
        }
        setCompletedExtractStages((prev) => {
          if (prev.includes(stageKey)) {
            return prev;
          }
          return [...prev, stageKey];
        });
        setJustCompletedStage(stageKey);
        if (completedStageEffectRef.current !== null) {
          window.clearTimeout(completedStageEffectRef.current);
          completedStageEffectRef.current = null;
        }
        completedStageEffectRef.current = window.setTimeout(() => {
          setJustCompletedStage(null);
          completedStageEffectRef.current = null;
        }, 900);
      },
      (progress) => {
        const stageKey = toExtractStageKey(progress.step);
        setActiveExtractStage(stageKey);
        setStreamStep(`处理中：${extractStageLabel(stageKey)}`);
      },
      (data) => {
        setStructured(data);
        setManualJson(JSON.stringify(data, null, 2));
        setStreamStep('提取完成');
        setCompletedExtractStages(extractStages.map((item) => item.key));
        setActiveExtractStage(null);
        setJustCompletedStage(null);
        source.close();
        streamSourceRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
      },
      (message) => {
        setStreamStep(`提取失败：${message}`);
        setActiveExtractStage(null);
        source.close();
        streamSourceRef.current = null;
      },
    );

    streamSourceRef.current = source;

    return () => source.close();
  };

  return (
    <div className='rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900'>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold'>候选人详情</h2>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            className='rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-500 dark:border-slate-600'
            onClick={handleSseExtract}
          >
            AI 提取（SSE）
          </button>
        </div>
      </div>

      <p className='text-sm text-slate-500 dark:text-slate-400'>
        {animatedStreamStep || streamStep || '可开始 AI 结构化提取'}
        {(isTypingStreamStep || (streamStep && !animatedStreamStep)) && (
          <span className='ml-0.5 inline-block h-4 w-[1px] animate-pulse bg-current align-middle' aria-hidden='true' />
        )}
      </p>

      <div className='mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/40'>
        <div className='mb-2 flex items-center justify-between text-xs sm:text-sm'>
          <span className='font-medium text-slate-700 dark:text-slate-200'>
            提取进度：{completedStageCount}/{extractStages.length}
          </span>
          <span className='text-slate-600 dark:text-slate-300'>当前：{extractStageLabel(activeExtractStage)}</span>
        </div>
        <div className='h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
          <div
            className='h-full rounded-full bg-blue-500 transition-all duration-500 ease-out'
            style={{ width: `${extractProgress}%` }}
          />
        </div>
        <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2'>
          {extractStages.map((stage) => {
            const isDone = completedExtractStages.includes(stage.key);
            const isActive = activeExtractStage === stage.key && !isDone;
            const isFreshDone = justCompletedStage === stage.key;

            return (
              <div
                key={stage.key}
                className={`flex items-center justify-between rounded-md border px-2.5 py-2 transition ${
                  isDone
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20'
                    : isActive
                      ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isDone
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : isActive
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {stage.label}
                </span>

                {isDone ? (
                  <span className='relative inline-flex h-7 w-7 items-center justify-center'>
                    {isFreshDone && (
                      <span className='absolute inline-flex h-7 w-7 rounded-full bg-emerald-400/60 animate-ping' />
                    )}
                    <span className={`relative text-xl ${isFreshDone ? 'animate-bounce' : ''}`}>✅</span>
                  </span>
                ) : isActive ? (
                  <span className='inline-flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse' aria-hidden='true' />
                ) : (
                  <span className='inline-flex h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600' aria-hidden='true' />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className='mt-2 flex items-center gap-2'>
        <label className='text-sm'>流程状态：</label>
        <select
          className='rounded-lg border border-slate-300 px-3 py-1 text-sm dark:border-slate-600 dark:bg-slate-900'
          value={candidate.status}
          onChange={(event) =>
            statusMutation.mutate({
              id: candidate.id,
              status: event.target.value as CandidateStatus,
            })
          }
        >
          {statuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className='mt-3 grid grid-cols-1 gap-3 2xl:grid-cols-2'>
        <section>
          <h3 className='mb-1 font-medium'>结构化信息</h3>
          <pre className='min-h-[180px] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs dark:border-slate-700 dark:bg-slate-950/40'>
            {displayedStructuredJson}
            {isTypingStructured && (
              <span className='ml-0.5 inline-block h-3 w-[1px] animate-pulse bg-current align-middle' aria-hidden='true' />
            )}
          </pre>
        </section>

        <section>
          <h3 className='mb-1 font-medium'>手动修正（JSON）</h3>
          <textarea
            className='w-full rounded-lg border border-slate-300 bg-white p-2 text-xs dark:border-slate-600 dark:bg-slate-900'
            value={manualJson}
            onChange={(event) => setManualJson(event.target.value)}
            rows={16}
          />
          <button
            type='button'
            className='mt-2 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:border-blue-500 dark:border-slate-600'
            onClick={() => {
              try {
                const parsed = JSON.parse(manualJson) as ResumeStructured;
                saveMutation.mutate({ id: candidate.id, payload: parsed });
              } catch {
                alert('JSON 格式错误');
              }
            }}
          >
            保存修正
          </button>
        </section>
      </div>

      <section>
        <div className='mb-2 mt-4'>
          <div className='mb-3 grid gap-2'>
            <h3 className='font-medium'>已保存 JD（当前：{selectedTitle}）</h3>
            {jobsQuery.isLoading && <p className='animate-pulse text-sm text-slate-500'>加载中...</p>}
            {jobsQuery.data?.map((job) => (
              <button
                type='button'
                key={job.id}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  selectedJobId === job.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                onClick={() => onSelectJob(job.id)}
              >
                {job.title}
              </button>
            ))}
          </div>

          <button
            type='button'
            className='rounded-lg border border-slate-300 px-3 py-2 text-sm enabled:hover:border-blue-500 disabled:opacity-50 dark:border-slate-600'
            disabled={!selectedJobId || scoreMutation.isPending}
            onClick={() => scoreMutation.mutate({ id: candidate.id, jobId: selectedJobId })}
          >
            {scoreMutation.isPending ? (
              <span className='inline-flex items-center gap-2'>
                <span
                  className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent'
                  aria-hidden='true'
                />
                评分中...
              </span>
            ) : (
              '岗位匹配评分'
            )}
          </button>
          {scoreMutation.isPending && (
            <p className='mt-2 animate-pulse text-sm text-blue-600 dark:text-blue-400'>
              AI 正在进行岗位匹配评分，请稍候...
            </p>
          )}
        </div>
        <h3 className='mb-2 mt-4 font-medium'>评分详情</h3>
        {latestScore ? (
          <>
            <div className='relative mb-3 h-[112px] w-[112px]'>
              <svg className='h-full w-full -rotate-90' viewBox='0 0 112 112' role='img' aria-label='综合匹配度'>
                <circle
                  cx='56'
                  cy='56'
                  r={progressRadius}
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='10'
                  className='text-slate-300 dark:text-slate-700'
                />
                <circle
                  cx='56'
                  cy='56'
                  r={progressRadius}
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='10'
                  strokeLinecap='round'
                  strokeDasharray={progressCircumference}
                  strokeDashoffset={progressOffset}
                  className='text-blue-500'
                />
              </svg>
              <div className='absolute inset-0 py-7 grid place-items-center text-center'>
                <div className='text-3xl font-bold'>{latestScore.total}</div>
                <small>综合匹配度</small>
              </div>
            </div>
            <p className='text-sm text-slate-600 dark:text-slate-300'>{latestScore.comment}</p>
            <ScoreCharts score={latestScore} />
          </>
        ) : (
          <p className='text-sm text-slate-500 dark:text-slate-400'>暂无评分结果</p>
        )}
      </section>

      <section>
        <h3 className='mb-2 mt-4 font-medium'>原始 PDF 预览</h3>
        <iframe
          title='candidate-pdf'
          src={`${import.meta.env.VITE_API_BASE ?? 'http://localhost:4000'}${candidate.fileUrl}`}
          className='min-h-[420px] w-full rounded-lg border border-slate-300 dark:border-slate-600'
        />
      </section>
    </div>
  );
}
