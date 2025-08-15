import React, { useMemo, useState, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from "recharts";
import * as htmlToImage from "html-to-image";
import { Task, Milestone, Owner, Goal, Action, ChartDataItem } from "./types";

// ===== ヘルパー（日付） =====
const DAY = 24 * 60 * 60 * 1000;
const parseISO = (s: string): Date => {
  // "YYYY-MM-DD" をタイムゾーンずれなくパース
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};
const fmt = (d: Date): string => new Intl.DateTimeFormat("ja-JP", { month: "2-digit", day: "2-digit" }).format(d);

// ===== データ：会議ベースの計画（担当配分：AI = sena／ナレッジ = LS） =====
const RAW_TASKS: Task[] = [
  // P0 ガバナンス
  { id: 1, phase: "P0 ガバナンス", name: "キックオフ＆KPI・ルール合意", owner: "Joint", ownerDisplay: "LS（たくみ）×sena", start: "2025-08-18", end: "2025-08-19", deliverable: "M0: 目的・KPI・データガバナンス合意書", deps: [] },
  { id: 2, phase: "P0 ガバナンス", name: "アクセス・権限・フォルダ標準化", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-08-18", end: "2025-08-20", deliverable: "権限一覧・命名規則・フォルダ構成図", deps: [1] },

  // P1 ナレッジ基盤（LS主体、PoCのみsena）
  { id: 3, phase: "P1 ナレッジ基盤", name: "Notionスキーマ設計（案件/顧客/議事録/見積/図面/材料/教訓）", owner: "LS", ownerDisplay: "LS", start: "2025-08-18", end: "2025-08-22", deliverable: "DB設計図・プロパティ定義・ビュー", deps: [2] },
  { id: 4, phase: "P1 ナレッジ基盤", name: "レポート/議事録/現調報告テンプレ整備", owner: "LS", ownerDisplay: "LS", start: "2025-08-20", end: "2025-08-27", deliverable: "テンプレ3種v1・記入ガイド", deps: [3] },
  { id: 5, phase: "P1 ナレッジ基盤", name: "音声→定型議事録パイプラインPoC", owner: "sena", ownerDisplay: "sena", start: "2025-08-21", end: "2025-08-27", deliverable: "音声投入で同一書式アウトプット", deps: [3,4] },
  { id: 6, phase: "P1 ナレッジ基盤", name: "トラブル事例の体系化（分類軸・必須項目）", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-08-22", end: "2025-08-29", deliverable: "事例入力フォーム・分類コード", deps: [3] },
  { id: 7, phase: "P1 ナレッジ基盤", name: "ゲート審査：KB/テンプレ承認", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-08-29", end: "2025-08-29", deliverable: "M1: 承認議事録", deps: [3,4,5,6] },

  // P2 Web基盤
  { id: 8, phase: "P2 Web基盤", name: "コンテンツ棚卸し＆素材収集（4事業部）", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-08-25", end: "2025-08-29", deliverable: "要件一覧・素材リスト", deps: [7] },
  { id: 9, phase: "P2 Web基盤", name: "IA/サイトマップ/ワイヤー作成", owner: "sena", ownerDisplay: "sena", start: "2025-09-01", end: "2025-09-05", deliverable: "サイトマップ・主要ワイヤー", deps: [8] },
  { id: 10, phase: "P2 Web基盤", name: "ビジュアルデザイン（ブランドトンマナ）", owner: "sena", ownerDisplay: "sena", start: "2025-09-08", end: "2025-09-12", deliverable: "デザイン案・UIコンポーネント", deps: [9] },
  { id: 11, phase: "P2 Web基盤", name: "CMS実装（ページ/コンポーネント）", owner: "sena", ownerDisplay: "sena", start: "2025-09-08", end: "2025-09-19", deliverable: "ステージング環境", deps: [9,10] },
  { id: 12, phase: "P2 Web基盤", name: "原稿作成・コンテンツ流し込み", owner: "LS", ownerDisplay: "LS", start: "2025-09-08", end: "2025-09-19", deliverable: "公開テキスト・画像反映", deps: [8,9] },
  { id: 13, phase: "P2 Web基盤", name: "総合QA・法務表示・パフォーマンステスト", owner: "sena", ownerDisplay: "sena", start: "2025-09-22", end: "2025-09-26", deliverable: "QAチェックリスト・改善項目完了", deps: [11,12] },
  { id: 14, phase: "P2 Web基盤", name: "ローンチ", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-09-29", end: "2025-09-29", deliverable: "M3: 公開完了", deps: [13] },

  // P3 MVP-新規開拓
  { id: 15, phase: "P3 MVP-新規開拓", name: "データ取得（不動産/SNS等）と正規化", owner: "sena", ownerDisplay: "sena", start: "2025-09-01", end: "2025-09-05", deliverable: "収集パイプライン・正規化スキーマ", deps: [7] },
  { id: 16, phase: "P3 MVP-新規開拓", name: "リードスコア初期モデル", owner: "sena", ownerDisplay: "sena", start: "2025-09-08", end: "2025-09-12", deliverable: "スコア算出・検証レポート", deps: [15] },
  { id: 17, phase: "P3 MVP-新規開拓", name: "訴求文/トークスクリプト自動生成", owner: "sena", ownerDisplay: "sena", start: "2025-09-15", end: "2025-09-19", deliverable: "生成プロンプト・出力テンプレ", deps: [16] },
  { id: 18, phase: "P3 MVP-新規開拓", name: "パイロット運用（10社）", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-09-22", end: "2025-09-26", deliverable: "M4: 反応率/商談化率レポート", deps: [17] },

  // P3 MVP-提案
  { id: 19, phase: "P3 MVP-提案", name: "7/3テンプレ最終化", owner: "LS", ownerDisplay: "LS", start: "2025-09-01", end: "2025-09-03", deliverable: "テンプレ確定版", deps: [7] },
  { id: 20, phase: "P3 MVP-提案", name: "コンテンツブロック・CTAライブラリ化", owner: "LS", ownerDisplay: "LS", start: "2025-09-03", end: "2025-09-10", deliverable: "ブロック集・用例", deps: [19] },
  { id: 21, phase: "P3 MVP-提案", name: "組版/アセンブリエンジン実装", owner: "sena", ownerDisplay: "sena", start: "2025-09-08", end: "2025-09-17", deliverable: "組版スクリプト・テスト", deps: [20] },
  { id: 22, phase: "P3 MVP-提案", name: "PDF出力＆ブランド適合", owner: "sena", ownerDisplay: "sena", start: "2025-09-15", end: "2025-09-19", deliverable: "PDFひな形・スタイル指針", deps: [21] },
  { id: 23, phase: "P3 MVP-提案", name: "パイロット提案（2社）", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-09-22", end: "2025-09-26", deliverable: "M5: 提案LT10分以内・受注率指標", deps: [22] },

  // P3 MVP-BIM
  { id: 24, phase: "P3 MVP-BIM", name: "ArchiCADプロファイル/テンプレ準備", owner: "sena", ownerDisplay: "sena", start: "2025-09-08", end: "2025-09-12", deliverable: "テンプレ/ショートカット", deps: [7] },
  { id: 25, phase: "P3 MVP-BIM", name: "スケッチ→簡易3DレイアウトPoC", owner: "sena", ownerDisplay: "sena", start: "2025-09-15", end: "2025-09-26", deliverable: "ワークフロー動画・検証", deps: [24] },
  { id: 26, phase: "P3 MVP-BIM", name: "レンダリングプリセット整備", owner: "sena", ownerDisplay: "sena", start: "2025-09-22", end: "2025-10-03", deliverable: "プリセット・チェックリスト", deps: [25] },
  { id: 27, phase: "P3 MVP-BIM", name: "現場テスト＆フィードバック", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-10-06", end: "2025-10-10", deliverable: "M5b: 現調→3D→パース所要時間KPI", deps: [26] },

  // P3 MVP-見積
  { id: 28, phase: "P3 MVP-見積", name: "仕様定義・品目スキーマ確定", owner: "LS", ownerDisplay: "LS", start: "2025-09-15", end: "2025-09-19", deliverable: "スキーマ・必須項目", deps: [7] },
  { id: 29, phase: "P3 MVP-見積", name: "見積パーサ＆ルールエンジン", owner: "sena", ownerDisplay: "sena", start: "2025-09-22", end: "2025-10-03", deliverable: "解析結果・異常検出", deps: [28] },
  { id: 30, phase: "P3 MVP-見積", name: "閾値・警告・レポート設計", owner: "sena", ownerDisplay: "sena", start: "2025-10-06", end: "2025-10-10", deliverable: "ダッシュボード雛形", deps: [29] },
  { id: 31, phase: "P3 MVP-見積", name: "パイロット運用", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-10-13", end: "2025-10-17", deliverable: "M6: 異常検出率/誤検出率レポート", deps: [30] },

  // P3 MVP-写真検査
  { id: 32, phase: "P3 MVP-写真検査", name: "タグ設計・撮影ルール策定", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-09-22", end: "2025-09-26", deliverable: "撮影チェックリスト", deps: [7] },
  { id: 33, phase: "P3 MVP-写真検査", name: "ベースモデル＆ダッシュボード", owner: "sena", ownerDisplay: "sena", start: "2025-10-06", end: "2025-10-17", deliverable: "検出結果可視化", deps: [32] },
  { id: 34, phase: "P3 MVP-写真検査", name: "パイロット運用", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-10-20", end: "2025-10-24", deliverable: "M7: 検出精度レポート", deps: [33] },

  // P4 展開
  { id: 35, phase: "P4 展開", name: "SOP整備・トレーニング教材作成", owner: "Joint", ownerDisplay: "LS×sena", start: "2025-10-13", end: "2025-10-24", deliverable: "SOP・動画・演習", deps: [23,27,31,34] },
  { id: 36, phase: "P4 展開", name: "全社トレーニング（営業/設計/施工/PM）", owner: "LS", ownerDisplay: "LS（新井）", start: "2025-10-27", end: "2025-11-07", deliverable: "受講記録・定着度サーベイ", deps: [35] },
  { id: 37, phase: "P4 展開", name: "KPI測定・Go/No-Go審査", owner: "LS", ownerDisplay: "LS（たくみ）", start: "2025-11-10", end: "2025-11-14", deliverable: "M8: KPI達成判断・次期計画", deps: [36] },

  // スポット
  { id: 38, phase: "スポット", name: "蕨PJ: ガス経路図作成（座席配管）", owner: "sena", ownerDisplay: "sena", start: "2025-08-18", end: "2025-08-22", deliverable: "配管経路図", deps: [] },
];

// マイルストーン
const MILESTONES: Milestone[] = [
  { name: "M1 承認（KB/テンプレ）", date: "2025-08-29" },
  { name: "M3 Webローンチ", date: "2025-09-29" },
  { name: "M4 新規開拓パイロット", date: "2025-09-26" },
  { name: "M5 提案パイロット", date: "2025-09-26" },
  { name: "M5b BIMフィードバック", date: "2025-10-10" },
  { name: "M6 見積チェッカーPoC", date: "2025-10-17" },
  { name: "M7 写真検査PoC", date: "2025-10-24" },
  { name: "M8 Go/No-Go", date: "2025-11-14" },
];

// フェーズごとの色（Tailwind系の落ち着いた配色）
const PHASE_COLORS: Record<string, string> = {
  "P0 ガバナンス": "#334155", // slate-700
  "P1 ナレッジ基盤": "#0ea5e9", // sky-500
  "P2 Web基盤": "#22c55e", // green-500
  "P3 MVP-新規開拓": "#f59e0b", // amber-500
  "P3 MVP-提案": "#6366f1", // indigo-500
  "P3 MVP-BIM": "#06b6d4", // cyan-500
  "P3 MVP-見積": "#ef4444", // red-500
  "P3 MVP-写真検査": "#84cc16", // lime-500
  "P4 展開": "#a855f7", // purple-500
  "スポット": "#64748b", // slate-500
};

// 所有者（担当）
const OWNERS: Owner[] = [
  { key: "All", label: "すべて" },
  { key: "sena", label: "sena" },
  { key: "LS", label: "LS" },
  { key: "Joint", label: "Joint" },
];

// 目標シート（個人KPI）デフォルト
const DEFAULT_GOALS: Goal[] = [
  {
    person: "sena",
    role: "AI・DX戦略（建築）",
    period: "2025-Q3",
    revenueTarget: 12000000,
    grossTarget: 4800000,
    salary: 1500000,
    skills: ["提案自動化v1出荷", "BIM即時3Dワークフロー", "見積AI PoC"],
    principles: ["スピード", "再現性", "透明性"],
    actions: [
      { what: "MVP週次レビュー（提案/BIM/見積/写真）", cadence: "毎週", kpi: "各MVPの進捗100%" },
      { what: "ナレッジ設計レビュー（LSと）", cadence: "隔週", kpi: "テンプレ改善2件/週" },
      { what: "サイトIA→デザイン→CMS連携", cadence: "毎週", kpi: "M3達成" }
    ]
  },
  {
    person: "新井",
    role: "LS（設計/施工PM）",
    period: "2025-Q3",
    revenueTarget: 9000000,
    grossTarget: 3600000,
    salary: 1200000,
    skills: ["現調→3D→パース高速化", "撮影ルール整備"],
    principles: ["正確性", "共有", "安全"],
    actions: [
      { what: "テンプレ記入ルール徹底", cadence: "毎日", kpi: "議事録/報告100%記入" },
      { what: "BIM現場テスト", cadence: "10/06-10/10", kpi: "所要時間KPI提出" },
      { what: "写真タグ運用", cadence: "毎現場", kpi: "撮影漏れ0件" }
    ]
  },
  {
    person: "たくみ",
    role: "LS（代表/営業）",
    period: "2025-Q3",
    revenueTarget: 15000000,
    grossTarget: 6000000,
    salary: 2000000,
    skills: ["新規開拓MVP運用", "7/3提案テンプレ最適化"],
    principles: ["意思決定", "スピード", "顧客価値"],
    actions: [
      { what: "パイロット10社運用", cadence: "9/22-9/26", kpi: "反応率/商談化率レポート" },
      { what: "提案パイロット2社", cadence: "9/22-9/26", kpi: "受注率指標提出" },
      { what: "対外パートナー開拓", cadence: "毎週", kpi: "面談2件/週" }
    ]
  }
];

export default function App() {
  const [phaseFilter, setPhaseFilter] = useState<Set<string>>(() => new Set(Object.keys(PHASE_COLORS)));
  const [ownerFilter, setOwnerFilter] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [zoom, setZoom] = useState<"day" | "week" | "month">("week");
  const [activeId, setActiveId] = useState<number | null>(null);
  const chartRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // === 目標シート 用状態/関数 ===
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [editGoals, setEditGoals] = useState<boolean>(false);
  const fmtJPY = (n: number): string => (typeof n === 'number' ? `¥${n.toLocaleString('ja-JP')}` : '-');
  const ratioColor = (r: number | null): string => {
    if (r == null || isNaN(r)) return '#e2e8f0';
    if (r <= 0.35) return '#22c55e';
    if (r <= 0.5) return '#f59e0b';
    return '#ef4444';
  };
  const updateGoal = (idx: number, key: keyof Goal, val: any) => {
    setGoals(prev => prev.map((g, i) => i === idx ? { ...g, [key]: val } : g));
  };
  const downloadGoalCSV = () => {
    const headers = ["名前", "役割", "期間", "売上目標", "粗利目標", "給与", "給与/粗利", "スキル", "行動指針", "アクション(what|cadence|kpi)"];
    const lines = [headers.join(",")];
    goals.forEach(g => {
      const ratio = g.grossTarget ? (g.salary / g.grossTarget) : '';
      const skills = (g.skills || []).join(' / ');
      const pr = (g.principles || []).join(' / ');
      const acts = (g.actions || []).map(a => `${a.what}|${a.cadence}|${a.kpi}`).join(' || ');
      lines.push([g.person, g.role, g.period, g.revenueTarget, g.grossTarget, g.salary, ratio, `"${skills}"`, `"${pr}"`, `"${acts}"`].join(','));
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "LS×sena_GoalSheet.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const tasks = useMemo(() => RAW_TASKS.map(t => ({
    ...t,
    startDate: parseISO(t.start),
    endDate: parseISO(t.end),
  })), []);

  // フィルタリング
  const filtered = useMemo(() => {
    return tasks.filter(t => phaseFilter.has(t.phase))
      .filter(t => ownerFilter === "All" ? true : t.owner === ownerFilter)
      .filter(t => query.trim() ? (
        t.name.includes(query) || t.phase.includes(query) || String(t.id).includes(query) || t.ownerDisplay.includes(query)
      ) : true);
  }, [tasks, phaseFilter, ownerFilter, query]);

  // 期間（ドメイン）
  const { domainStart, domainEnd } = useMemo(() => {
    const minStart = filtered.reduce((acc, t) => acc < t.startDate! ? acc : t.startDate!, filtered[0]?.startDate || parseISO("2025-08-18"));
    const maxEnd = filtered.reduce((acc, t) => acc > t.endDate! ? acc : t.endDate!, filtered[0]?.endDate || parseISO("2025-11-14"));
    // 余白を追加
    const pad = 2; // 2日
    const ds = new Date(minStart.getTime() - pad * DAY);
    const de = new Date(maxEnd.getTime() + pad * DAY);
    return { domainStart: ds, domainEnd: de };
  }, [filtered]);

  // ガント描画用データ（積み上げ：offset + duration）
  const chartData: ChartDataItem[] = useMemo(() => {
    const base = domainStart.getTime();
    return filtered
      .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime() || a.id - b.id)
      .map((t, i) => {
        const offsetDays = Math.max(0, Math.round((t.startDate!.getTime() - base) / DAY));
        const durationDays = Math.max(1, Math.round((t.endDate!.getTime() - t.startDate!.getTime()) / DAY) + 1);
        const label = `${t.id} ${t.name}（${t.ownerDisplay}）`;
        return {
          ...t,
          i,
          label,
          offset: offsetDays,
          duration: durationDays,
          color: PHASE_COLORS[t.phase] || "#94a3b8",
        };
      });
  }, [filtered, domainStart]);

  // 依存チェーンのハイライト
  const highlighted = useMemo(() => {
    if (!activeId) return new Set();
    const id2task = new Map(tasks.map(t => [t.id, t]));
    const chain = new Set([activeId]);
    const stack = [activeId];
    // 上流（依存元）を辿る
    while (stack.length) {
      const cur = stack.pop()!;
      const t = id2task.get(cur);
      (t?.deps || []).forEach(d => { if (!chain.has(d)) { chain.add(d); stack.push(d); } });
    }
    // 下流（依存先）も辿る
    const forward = (id: number) => {
      tasks.forEach(tt => { if (tt.deps.includes(id) && !chain.has(tt.id)) { chain.add(tt.id); forward(tt.id); } });
    };
    forward(activeId);
    return chain;
  }, [activeId, tasks]);

  // X軸の目盛密度
  const tickStep = useMemo(() => {
    switch (zoom) {
      case "day": return 1;      // 毎日
      case "week": return 7;     // 週
      case "month": return 30;   // おおよそ月
      default: return 7;
    }
  }, [zoom]);

  const totalDays = Math.round((domainEnd.getTime() - domainStart.getTime()) / DAY);
  const xTicks = useMemo(() => {
    const arr = [];
    for (let d = 0; d <= totalDays; d += tickStep) arr.push(d);
    if (arr[arr.length - 1] !== totalDays) arr.push(totalDays);
    return arr;
  }, [totalDays, tickStep]);

  // CSVダウンロード
  const downloadCSV = () => {
    const headers = ["ID", "フェーズ", "タスク", "担当", "開始日", "終了日", "成果物/受入基準", "依存"];
    const lines = [headers.join(",")];
    RAW_TASKS.forEach(t => {
      const deps = t.deps?.join(" ") || "";
      const row = [t.id, t.phase, `"${t.name}"`, t.ownerDisplay, t.start, t.end, `"${t.deliverable}"`, `"${deps}"`].join(",");
      lines.push(row);
    });
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "LS×sena_Gantt.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // PNG出力（チャート領域）
  const exportPNG = async () => {
    if (!containerRef.current) return;
    const dataUrl = await htmlToImage.toPng(containerRef.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl; a.download = "LS×sena_Gantt.png"; a.click();
  };

  // フェーズトグル
  const togglePhase = (p: string) => {
    const next = new Set(phaseFilter);
    if (next.has(p)) next.delete(p); else next.add(p);
    setPhaseFilter(next);
  };

  // 本日線
  const today = parseISO("2025-08-14");
  const todayX = Math.round((today.getTime() - domainStart.getTime()) / DAY);

  return (
    <div className="min-h-screen w-full bg-[#0b1020] text-white font-[Noto Sans JP],sans-serif">
      {/* ヘッダー */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">LS × sena｜AI導入マスタープラン・インタラクティブGantt</h1>
            <p className="text-sm opacity-80 mt-1">開始日 2025-08-18（JST）／マイルストーン：M1→M3→M4/M5→M5b→M6→M7→M8</p>
          </div>
          <div className="flex gap-2">
            <button onClick={downloadCSV} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">CSVダウンロード</button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">印刷</button>
            <button onClick={exportPNG} className="px-3 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 transition">PNG出力</button>
          </div>
        </div>

        {/* コントロールパネル */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xs uppercase opacity-70 mb-2">フェーズ表示</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PHASE_COLORS).map(p => (
                <button key={p} onClick={() => togglePhase(p)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${phaseFilter.has(p) ? 'bg-white/15 border-white/30' : 'bg-transparent border-white/10 opacity-60'}`}
                  title={p}
                >
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: PHASE_COLORS[p] }} />{p}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xs uppercase opacity-70 mb-2">担当フィルタ</div>
            <div className="flex gap-2 flex-wrap">
              {OWNERS.map(o => (
                <button key={o.key} onClick={() => setOwnerFilter(o.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${ownerFilter === o.key ? 'bg-white/15 border-white/30' : 'bg-transparent border-white/10 opacity-60'}`}>{o.label}</button>
              ))}
            </div>
            <div className="mt-3">
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="タスク／ID／フェーズ検索" className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 outline-none" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-xs uppercase opacity-70 mb-2">表示スケール</div>
            <div className="flex gap-2">
              {(["day", "week", "month"] as const).map(z => (
                <button key={z} onClick={() => setZoom(z)} className={`px-3 py-1.5 rounded-full text-sm border ${zoom === z ? 'bg-white/15 border-white/30' : 'bg-transparent border-white/10 opacity-60'}`}>{z}</button>
              ))}
            </div>
            <div className="text-xs opacity-70 mt-3">クリックで依存チェーンをハイライト</div>
          </div>
        </div>

        {/* ガント本体 */}
        <div ref={containerRef} className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-white/0">
          <div className="px-5 py-3 text-sm opacity-90 border-b border-white/10">期間：{toISO(domainStart)} 〜 {toISO(domainEnd)}（{totalDays} 日）</div>
          <div className="w-full h-[680px] px-2 py-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart ref={chartRef} data={chartData} layout="vertical" margin={{ top: 24, right: 40, bottom: 24, left: 220 }}>
                <XAxis type="number" domain={[0, totalDays]} ticks={xTicks} tickFormatter={(v: number) => {
                  const d = new Date(domainStart.getTime() + v * DAY); return fmt(d);
                }} stroke="#cbd5e1" />
                <YAxis type="category" dataKey="label" width={220} tick={{ fill: "#e2e8f0" }} />
                <Tooltip content={({ active, payload }: any) => {
                  if (!active || !payload || !payload.length) return null;
                  const p = payload[1]?.payload || payload[0]?.payload; // 0: offset, 1: duration
                  if (!p) return null;
                  return (
                    <div className="backdrop-blur bg-white/10 border border-white/20 rounded-xl p-3 text-sm max-w-[360px]">
                      <div className="font-semibold mb-1">{p.id}. {p.name}</div>
                      <div className="opacity-80">フェーズ：{p.phase}</div>
                      <div className="opacity-80">担当：{p.ownerDisplay}</div>
                      <div className="opacity-80">期間：{p.start} → {p.end}（{p.duration}日）</div>
                      <div className="opacity-80 mt-1">受入基準：{p.deliverable}</div>
                      {p.deps?.length ? <div className="opacity-70 mt-1">依存：{p.deps.join(', ')}</div> : null}
                    </div>
                  );
                }} />
                {/* 本日線 */}
                {(todayX >= 0 && todayX <= totalDays) && (
                  <ReferenceLine x={todayX} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Today", position: "top", fill: "#e11d48" }} />
                )}
                {/* マイルストーン */}
                {MILESTONES.map((m: Milestone, index: number) => {
                  const x = Math.round((parseISO(m.date).getTime() - domainStart.getTime()) / DAY);
                  if (x < 0 || x > totalDays) return null;
                  
                  // ラベルの重複を避けるため、Y位置を調整
                  const offset = (index % 3) * 15; // 3つのレベルで配置
                  const position = index % 2 === 0 ? "top" : "bottom";
                  
                  return <ReferenceLine 
                    key={m.name} 
                    x={x} 
                    stroke="#94a3b8" 
                    strokeDasharray="4 2" 
                    label={{ 
                      value: m.name, 
                      position: position,
                      fill: "#94a3b8", 
                      fontSize: 11,
                      offset: offset
                    }} 
                  />
                })}
                {/* オフセット（不可視） */}
                <Bar dataKey="offset" stackId="a" fill="transparent" />
                {/* 実バー */}
                <Bar dataKey="duration" stackId="a" radius={[0, 6, 6, 0]}>
                  {chartData.map((entry, index) => {
                    const base = entry.color;
                    const isHL = highlighted.size ? highlighted.has(entry.id) : true;
                    const fill = base;
                    return (
                      <Cell key={`cell-${index}`} fill={fill} opacity={isHL ? 1 : 0.25} stroke="#0f172a" strokeWidth={1}
                        onClick={() => setActiveId(entry.id)} cursor="pointer" />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* サマリーパネル */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm font-semibold">次のマイルストーン</div>
            <ol className="mt-2 list-decimal ml-5 space-y-1 text-sm opacity-90">
              {MILESTONES.map(m => (
                <li key={m.name}>{m.name}（{m.date}）</li>
              ))}
            </ol>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm font-semibold">責任分担</div>
            <ul className="mt-2 space-y-1 text-sm opacity-90">
              <li><span className="font-medium">sena：</span> AI実装全般（議事録PoC/提案自動化/BIM/見積解析/写真検査/サイト実装）</li>
              <li><span className="font-medium">LS：</span> ナレッジ設計・素材収集・パイロット運用・社内展開・KPI審査</li>
              <li><span className="font-medium">Joint：</span> ガバナンス・SOP/トレーニング整備</li>
            </ul>
          </div>
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="text-sm font-semibold">レビュー運用</div>
            <ul className="mt-2 space-y-1 text-sm opacity-90">
              <li>週次レビュー：M1→M3→M4/M5→M5b→M6→M7→M8の達成度</li>
              <li>受入基準：各タスクの<strong>成果物</strong>の有無で判定</li>
              <li>依存崩れは即リスケ（クリックでチェーンを確認）</li>
            </ul>
          </div>
        </div>

        {/* 目標シート（個人KPI & アクション） */}
        <div className="mt-8 p-5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">目標シート（個人KPI & アクション）</h2>
            <div className="flex gap-2">
              <button onClick={() => setEditGoals(v => !v)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">{editGoals ? '編集終了' : '編集'}</button>
              <button onClick={downloadGoalCSV} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition">CSV</button>
            </div>
          </div>
          <div className="text-xs opacity-70 mt-1">前提：健全な<b>給料バランス</b>目安 = 給与 / 粗利 ≤ 35%（50%超は警戒）</div>
          
          {/* カード形式での表示 */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {goals.map((g, idx) => {
              const ratio = g.grossTarget ? (g.salary / g.grossTarget) : null;
              return (
                <div key={g.person} className="p-6 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 transition-all">
                  {/* ヘッダー */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{g.person}</h3>
                      <p className="text-sm opacity-80">{g.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs opacity-70">給料バランス</div>
                      <div className="text-lg font-bold" style={{ color: ratioColor(ratio) }}>
                        {ratio ? `${Math.round(ratio * 100)}%` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* KPI数値 */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs opacity-70 mb-1">期間</div>
                      {editGoals ? (
                        <input value={g.period || ''} onChange={e => updateGoal(idx, 'period', e.target.value)} 
                          className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-sm" />
                      ) : (
                        <div className="font-medium">{g.period}</div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs opacity-70 mb-1">売上目標</div>
                      {editGoals ? (
                        <input type="number" value={g.revenueTarget || 0} onChange={e => updateGoal(idx, 'revenueTarget', Number(e.target.value))} 
                          className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-sm" />
                      ) : (
                        <div className="font-medium text-green-400">{fmtJPY(g.revenueTarget)}</div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs opacity-70 mb-1">粗利目標</div>
                      {editGoals ? (
                        <input type="number" value={g.grossTarget || 0} onChange={e => updateGoal(idx, 'grossTarget', Number(e.target.value))} 
                          className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-sm" />
                      ) : (
                        <div className="font-medium text-blue-400">{fmtJPY(g.grossTarget)}</div>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-xs opacity-70 mb-1">給与</div>
                      {editGoals ? (
                        <input type="number" value={g.salary || 0} onChange={e => updateGoal(idx, 'salary', Number(e.target.value))} 
                          className="w-full px-2 py-1 rounded bg-white/10 border border-white/10 text-sm" />
                      ) : (
                        <div className="font-medium text-yellow-400">{fmtJPY(g.salary)}</div>
                      )}
                    </div>
                  </div>

                  {/* スキル */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2 text-purple-300">重点スキル</div>
                    <div className="flex flex-wrap gap-2">
                      {(g.skills || []).map(s => (
                        <span key={s} className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-200 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 行動指針 */}
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2 text-cyan-300">行動指針</div>
                    <div className="flex flex-wrap gap-2">
                      {(g.principles || []).map(s => (
                        <span key={s} className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-200 text-xs">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* アクション */}
                  <div>
                    <div className="text-sm font-medium mb-3 text-orange-300">アクション</div>
                    <div className="space-y-3">
                      {(g.actions || []).map((a, i) => (
                        <div key={i} className="p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-orange-400/10 border border-orange-500/20">
                          <div className="font-medium text-sm text-orange-200">{a.what}</div>
                          <div className="text-xs opacity-80 mt-1">
                            <span className="text-green-300">頻度: {a.cadence}</span> • 
                            <span className="text-blue-300 ml-1">KPI: {a.kpi}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* フッター */}
        <div className="text-xs opacity-60 mt-8 pb-10">© 2025 LS × sena — Noto Sans JP / Recharts / html-to-image. 印刷はA3横推奨。</div>
      </div>
      {/* Tailwindベースの簡易スタイル（キャンバスでも動作） */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap');
        * { font-family: 'Noto Sans JP', system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji','Segoe UI Emoji'; }
        @media print {
          body { background: white; color: #111; }
          .bg-\\[\\#0b1020\\] { background: white !important; }
          .text-white { color: #111 !important; }
          .border-white\\/10 { border-color: #e5e7eb !important; }
          .bg-white\\/5 { background: #fff !important; }
          .bg-white\\/10, .bg-white\\/15, .bg-white\\/20 { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}