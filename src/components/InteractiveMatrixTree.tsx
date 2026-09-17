import React, { useState, useMemo, useRef } from 'react';
import { 
  Users, 
  ArrowUpRight, 
  CheckCircle2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Sparkles, 
  X, 
  Info,
  ChevronRight,
  Search,
  ChevronDown,
  Copy,
  Check,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface MatrixNodeData {
  id: string;
  full_name: string;
  email: string;
  referral_code: string;
  is_active: boolean;
  joining_date?: string;
  sponsor_id?: string;
  direct_referrals_count?: number;
  team_size?: number;
  total_income?: number;
  didIPayReceive?: boolean;
  moneyReceived?: number;
  isPassedUp?: boolean;
  is_passup?: boolean;
  flowType?: 'PASS_UP' | 'DIRECT_KEEP';
  utr?: string | null;
  saleNum?: number;
  totalBranchPassiveIncome?: number;
  children?: MatrixNodeData[];
  downlines?: any[];
}

interface InteractiveMatrixTreeProps {
  currentUser: {
    id: string;
    full_name?: string;
    referral_code?: string;
    email?: string;
    is_active?: boolean;
    direct_referrals_count?: number;
    total_income?: number;
  };
  teamData: MatrixNodeData[];
  liveReferralUrl: string;
  onFetchSubTree?: (nodeId: string) => Promise<MatrixNodeData[]>;
}

export const InteractiveMatrixTree: React.FC<InteractiveMatrixTreeProps> = ({
  currentUser,
  teamData,
  liveReferralUrl,
  onFetchSubTree
}) => {
  const { packagePrice } = useAuth();
  const unitPrice = packagePrice || 5000;
  
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dynamicChildrenCache, setDynamicChildrenCache] = useState<Record<string, MatrixNodeData[]>>({});
  const [drillLoading, setDrillLoading] = useState(false);

  // Breadcrumb Trail
  const [drillDownPath, setDrillDownPath] = useState<Array<{ id: string; name: string; code: string }>>([
    { id: currentUser.id || 'root', name: currentUser.full_name || 'My Account', code: currentUser.referral_code || '' }
  ]);

  const [selectedNode, setSelectedNode] = useState<{
    node: MatrixNodeData | typeof currentUser;
    role: 'ROOT' | 'DIRECT_KEEP' | 'PASS_UP' | 'LEVEL_2';
    saleNumber?: number;
    parentName?: string;
  } | null>(null);

  const [filterType, setFilterType] = useState<'ALL' | 'ACTIVE' | 'PASSUP' | 'KEEP'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Active root resolution
  const currentRootId = drillDownPath[drillDownPath.length - 1]?.id;
  const isAtOriginalRoot = drillDownPath.length === 1;

  // Find active root node and its children
  const currentRootNode = useMemo(() => {
    if (isAtOriginalRoot) {
      return {
        ...currentUser,
        children: teamData
      };
    }

    // Check dynamic fetch cache first
    if (dynamicChildrenCache[currentRootId]) {
      return {
        id: currentRootId,
        full_name: drillDownPath[drillDownPath.length - 1]?.name || 'Member',
        referral_code: drillDownPath[drillDownPath.length - 1]?.code || '',
        children: dynamicChildrenCache[currentRootId]
      };
    }

    // Search in existing teamData tree recursively
    const findNode = (nodes: MatrixNodeData[], targetId: string): MatrixNodeData | null => {
      for (const n of nodes) {
        if (n.id === targetId) return n;
        if (n.children && n.children.length > 0) {
          const found = findNode(n.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };

    const target = findNode(teamData, currentRootId);
    return target || { ...currentUser, children: [] };
  }, [currentRootId, isAtOriginalRoot, currentUser, teamData, dynamicChildrenCache, drillDownPath]);

  const activeChildren = useMemo(() => {
    return (currentRootNode?.children || []) as MatrixNodeData[];
  }, [currentRootNode]);

  // Strict Data Ledger Verification (NO Array Indexing)
  const enrichedDirects = useMemo(() => {
    return activeChildren.map((node) => {
      // Prioritize database verified attributes
      const realSaleNum = node.saleNum ?? (node as any).sale_number ?? null;
      const isPassUp = node.isPassedUp ?? node.is_passup ?? (realSaleNum === 1 || realSaleNum === 3);
      
      return {
        ...node,
        saleNumber: realSaleNum,
        flowType: isPassUp ? ('PASS_UP' as const) : ('DIRECT_KEEP' as const)
      };
    });
  }, [activeChildren]);

  const filteredDirects = useMemo(() => {
    return enrichedDirects.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.referral_code?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filterType === 'ALL' ||
        (filterType === 'ACTIVE' && item.is_active) ||
        (filterType === 'PASSUP' && item.flowType === 'PASS_UP') ||
        (filterType === 'KEEP' && item.flowType === 'DIRECT_KEEP');

      return matchesSearch && matchesFilter;
    });
  }, [enrichedDirects, searchQuery, filterType]);

  // Next direct sale rule forecast
  const nextSaleNumber = (teamData?.length || 0) + 1;
  const isNextSalePassUp = nextSaleNumber === 1 || nextSaleNumber === 3;

  // Zoom / Pan handlers
  const handleZoom = (delta: number) => {
    setZoomLevel((prev) => Math.min(Math.max(0.5, Number((prev + delta).toFixed(1))), 1.8));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleNodeExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    activeChildren.forEach(c => { all[c.id] = true; });
    setExpandedNodes(all);
  };

  const collapseAll = () => {
    setExpandedNodes({});
  };

  // Dynamic on-demand drill down
  const handleDrillDown = async (node: MatrixNodeData) => {
    if (onFetchSubTree && !dynamicChildrenCache[node.id] && (!node.children || node.children.length === 0)) {
      setDrillLoading(true);
      try {
        const fetched = await onFetchSubTree(node.id);
        setDynamicChildrenCache(prev => ({ ...prev, [node.id]: fetched }));
      } catch (err) {
        console.error('Failed to load sub-tree:', err);
      } finally {
        setDrillLoading(false);
      }
    }

    setDrillDownPath(prev => [
      ...prev,
      { id: node.id, name: node.full_name, code: node.referral_code }
    ]);
    handleResetView();
    setSelectedNode(null);
  };

  const handleNavigateBreadcrumb = (index: number) => {
    setDrillDownPath(prev => prev.slice(0, index + 1));
    handleResetView();
  };

  const handleCopyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Smart Next Sale Forecast Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0c111d] via-[#111726] to-[#07090e] border border-[#1e2a40] shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-display text-sm">Next Direct Referral Forecast:</span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                isNextSalePassUp 
                  ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40' 
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
              }`}>
                Sale #{nextSaleNumber} • {isNextSalePassUp ? 'Pass-Up to Sponsor' : `Direct Kept (+ ₹${unitPrice.toLocaleString('en-IN')})`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isNextSalePassUp 
                ? 'Your next direct sale will pass to your qualifying sponsor (Qualifying Pass-Up Rule).'
                : `Your next direct sale will deposit ₹${unitPrice.toLocaleString('en-IN')} directly to your bank account via UPI!`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <span className="text-[11px] font-mono text-slate-400">
            Directs in Root: <strong className="text-white">{teamData.length}</strong>
          </span>
        </div>
      </div>

      {/* Visual Canvas Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[#0c1017] border border-[#1c2436] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member..."
              className="w-full pl-8 pr-3 py-1.5 bg-[#07090e] border border-[#1c2436] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 font-mono"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'KEEP', label: 'Direct Kept' },
              { id: 'PASSUP', label: 'Pass-Up' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-2.5 py-1.5 rounded-lg font-mono font-medium transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                  filterType === tab.id
                    ? 'gold-btn-gradient text-slate-950 font-bold shadow-sm'
                    : 'bg-[#111722] text-slate-400 hover:text-white border border-[#212c40]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#111722] border border-[#212c40] rounded-lg p-0.5">
            <button
              onClick={expandAll}
              className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Expand
            </button>
            <span className="text-slate-600">|</span>
            <button
              onClick={collapseAll}
              className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Collapse
            </button>
          </div>

          <div className="flex items-center bg-[#111722] border border-[#212c40] rounded-lg p-0.5">
            <button
              onClick={() => handleZoom(-0.1)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[36px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => handleZoom(0.1)}
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-slate-400 hover:text-white border-l border-[#212c40] transition-colors cursor-pointer"
              title="Center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tree Canvas */}
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative min-h-[580px] rounded-3xl bg-[#07090e] border border-[#1c2436] overflow-hidden shadow-2xl flex flex-col justify-between select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Breadcrumb Path */}
        <div className="relative z-10 p-3.5 sm:p-4 border-b border-[#1c2436] bg-[#0c1017]/95 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 overflow-x-auto text-slate-300">
            <span className="text-slate-400 mr-1">Path:</span>
            {drillDownPath.map((item, idx) => {
              const isLast = idx === drillDownPath.length - 1;
              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
                  <button
                    onClick={() => handleNavigateBreadcrumb(idx)}
                    className={`px-2 py-1 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      isLast
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-[#111722] text-slate-400 hover:text-white border border-[#212c40]'
                    }`}
                  >
                    <span>{item.name}</span>
                    {item.code && <span className="text-[10px] text-amber-400/80">#{item.code}</span>}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Direct Kept</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span>Pass-Up (To Upline)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Pass-Up Received</span>
            </div>
          </div>
        </div>

        {/* Viewport */}
        <div
          className="relative z-0 p-8 sm:p-12 overflow-visible flex flex-col items-center transition-transform duration-75 origin-top min-w-full"
          style={{ 
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})` 
          }}
        >
          {drillLoading ? (
            <div className="py-20 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="text-xs font-mono text-slate-400">Loading sub-tree records...</span>
            </div>
          ) : (
            <>
              {/* CURRENT ROOT NODE */}
              <div
                onClick={() => setSelectedNode({ node: currentRootNode as any, role: 'ROOT' })}
                className="group relative cursor-pointer"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-amber-700 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-72 sm:w-80 rounded-2xl bg-[#0c1017] border-2 border-amber-500/80 p-4 shadow-xl hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gold-btn-gradient text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                        {currentRootNode.full_name?.charAt(0)?.toUpperCase() || 'Y'}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-white tracking-tight truncate">{currentRootNode.full_name || 'Account'}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/40 shrink-0">
                            ROOT
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          #{currentRootNode.referral_code || 'CODE'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Active</span>
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        {activeChildren.length} Directs
                      </p>
                    </div>
                  </div>
                </div>
                {filteredDirects.length > 0 && (
                  <div className="w-0.5 h-8 bg-gradient-to-b from-amber-500 to-slate-700 mx-auto" />
                )}
              </div>

              {/* LEVEL 1 CHILDREN */}
              {filteredDirects.length === 0 ? (
                <div className="mt-8 text-center p-8 border border-dashed border-[#1c2436] rounded-2xl max-w-md bg-[#0c1017]/60">
                  <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">No Direct Team IDs in View</p>
                  <p className="text-xs text-slate-500 mt-1">Share your referral link to build direct IDs!</p>
                </div>
              ) : (
                <div className="w-full relative mt-1">
                  <div className="h-0.5 bg-slate-700 mx-auto w-[85%] relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-0.5 bg-[#07090e] border border-[#1c2436] text-[10px] font-mono text-slate-400 rounded-full whitespace-nowrap">
                      Direct Referrals ({filteredDirects.length})
                    </div>
                  </div>

                  <div className="pt-6 flex flex-wrap justify-center gap-6 sm:gap-8 items-start">
                    {filteredDirects.map((member) => {
                      const isPassUp = member.flowType === 'PASS_UP';
                      const childrenCount = member.children?.length || member.downlines?.length || 0;
                      const isExpanded = expandedNodes[member.id];

                      return (
                        <div key={member.id} className="flex flex-col items-center">
                          <div className={`w-0.5 h-6 ${isPassUp ? 'bg-cyan-500/60' : 'bg-emerald-500/60'}`} />

                          <div
                            onClick={() => setSelectedNode({
                              node: member,
                              role: isPassUp ? 'PASS_UP' : 'DIRECT_KEEP',
                              saleNumber: member.saleNumber || undefined,
                              parentName: currentRootNode.full_name
                            })}
                            className={`w-64 sm:w-72 rounded-2xl p-4 transition-all duration-200 cursor-pointer text-left relative overflow-hidden group shadow-lg ${
                              isPassUp
                                ? 'bg-[#0c1017] border-2 border-cyan-500/40 hover:border-cyan-400'
                                : 'bg-[#0c1017] border-2 border-emerald-500/40 hover:border-emerald-400'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                isPassUp
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                {isPassUp ? (
                                  <>
                                    <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                                    <span>Sale #{member.saleNumber ?? 'Pass-Up'}</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    <span>Sale #{member.saleNumber ?? 'Kept'}</span>
                                  </>
                                )}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${
                                member.is_active ? 'bg-emerald-400' : 'bg-slate-600'
                              }`} />
                            </div>

                            <div className="flex items-center gap-2.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isPassUp
                                  ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-500/30'
                                  : 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/30'
                              }`}>
                                {member.full_name?.charAt(0)?.toUpperCase() || 'M'}
                              </div>
                              <div className="overflow-hidden min-w-0">
                                <p className="text-xs font-bold text-white truncate">{member.full_name}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                  #{member.referral_code}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-[#1c2436] flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-400">Yield</span>
                              <span className={`font-bold tabular-nums ${isPassUp ? 'text-cyan-400' : 'text-emerald-400'}`}>
                                {isPassUp ? 'Passed to Upline' : `+ ₹${(member.moneyReceived || unitPrice).toLocaleString('en-IN')}`}
                              </span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-[#1c2436]/60 flex items-center justify-between gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDrillDown(member);
                                }}
                                className="px-2 py-1 rounded-lg bg-[#111722] hover:bg-[#1a2333] border border-[#212c40] text-[10px] font-mono text-amber-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <span>Drill Down</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>

                              {childrenCount > 0 && (
                                <button
                                  onClick={(e) => toggleNodeExpand(member.id, e)}
                                  className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/30 text-[10px] font-mono text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <span>{childrenCount} Downlines</span>
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* SUB-BRANCH CONTAINER */}
                          {childrenCount > 0 && isExpanded && (
                            <div className="flex flex-col items-center mt-2 animate-in fade-in slide-in-from-top-2">
                              <div className="w-0.5 h-4 bg-amber-500/40" />
                              <div className="p-3 rounded-2xl bg-[#0c1017]/95 border border-amber-500/30 space-y-2 w-64 sm:w-72 shadow-xl">
                                <div className="text-[10px] font-mono font-bold text-amber-400 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    <span>Branch Inflow</span>
                                  </span>
                                  <span className="text-[9px] text-slate-400">Verified Ledger</span>
                                </div>
                                <div className="space-y-1.5">
                                  {member.children?.map((child: any) => {
                                    const isChildPassupToYou = Boolean(child.didChildPayMe);
                                    return (
                                      <div
                                        key={child.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedNode({
                                            node: child,
                                            role: 'LEVEL_2',
                                            saleNumber: child.saleNum,
                                            parentName: member.full_name
                                          });
                                        }}
                                        className="p-2 rounded-xl bg-[#07090e] border border-[#1c2436] hover:border-amber-500/40 text-[10px] font-mono flex items-center justify-between cursor-pointer transition-all hover:bg-[#111722]"
                                      >
                                        <div className="overflow-hidden pr-2">
                                          <p className="text-slate-200 font-semibold truncate">{child.full_name}</p>
                                          <p className="text-[9px] text-slate-400">#{child.referral_code}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className={`font-bold block ${isChildPassupToYou ? 'text-amber-400' : 'text-slate-400'}`}>
                                            {isChildPassupToYou ? `+ ₹${(child.childMoney || unitPrice).toLocaleString('en-IN')} to You` : 'Kept by L1'}
                                          </span>
                                          <span className="text-[8px] text-slate-400">Sale #{child.saleNum || '-'}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Help */}
        <div className="relative z-10 p-3 bg-[#0c1017]/95 border-t border-[#1c2436] text-[11px] text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Tree Guide:</strong> Drag canvas to pan. Click <strong>Drill Down</strong> to explore deep sub-trees with real database sync.
            </span>
          </div>
          <div className="text-amber-400/90 font-mono text-[10px] font-bold">
            100% Peer-to-Peer 2-Up Matrix
          </div>
        </div>
      </div>

      {/* INSPECTOR MODAL */}
      {selectedNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-[#0c1017] border border-[#1c2436] shadow-2xl p-6 relative space-y-5">
            <button
              onClick={() => setSelectedNode(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-[#111722] text-slate-400 hover:text-white border border-[#212c40] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl gold-btn-gradient text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shrink-0">
                {selectedNode.node.full_name?.charAt(0)?.toUpperCase() || 'M'}
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white truncate">{selectedNode.node.full_name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-500/30 shrink-0">
                    {selectedNode.role}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-400 mt-0.5 truncate">
                  Code: #{selectedNode.node.referral_code} • {selectedNode.node.email}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#07090e] border border-[#1c2436] space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#1c2436]">
                <span className="text-slate-400">Matrix Position</span>
                <span className="text-white font-bold">
                  {selectedNode.saleNumber ? `Sale #${selectedNode.saleNumber}` : 'Root Account'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1c2436]">
                <span className="text-slate-400">Yield Rule</span>
                <span className={`font-bold ${
                  selectedNode.role === 'PASS_UP' 
                    ? 'text-cyan-400' 
                    : selectedNode.role === 'DIRECT_KEEP' 
                      ? 'text-emerald-400' 
                      : 'text-amber-400'
                }`}>
                  {selectedNode.role === 'PASS_UP' 
                    ? '1st & 3rd Pass-Up (Sent to Upline)' 
                    : selectedNode.role === 'DIRECT_KEEP' 
                      ? `100% Direct Kept (+ ₹${((selectedNode.node as any).moneyReceived || unitPrice).toLocaleString('en-IN')})` 
                      : selectedNode.role === 'LEVEL_2'
                        ? `Branch Inflow (+ ₹${((selectedNode.node as any).childMoney || unitPrice).toLocaleString('en-IN')})`
                        : 'Root ID'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#1c2436]">
                <span className="text-slate-400">Status</span>
                <span className={selectedNode.node.is_active ? 'text-emerald-400 font-bold flex items-center gap-1' : 'text-amber-400'}>
                  {selectedNode.node.is_active ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Verified ID</span>
                    </>
                  ) : (
                    'Pending Activation'
                  )}
                </span>
              </div>
              {(selectedNode.node as any).utr && (
                <div className="flex items-center justify-between pb-2 border-b border-[#1c2436]">
                  <span className="text-slate-400">Transaction UTR</span>
                  <span className="text-amber-400 font-bold">{(selectedNode.node as any).utr}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={() => handleCopyCode(selectedNode.node.referral_code || '')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#111722] hover:bg-[#1a2333] border border-[#212c40] text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
              <div className="flex items-center gap-2">
                {selectedNode.role !== 'ROOT' && (
                  <button
                    onClick={() => handleDrillDown(selectedNode.node as MatrixNodeData)}
                    className="px-4 py-2 rounded-xl gold-btn-gradient text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <span>Drill Down Branch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-4 py-2 rounded-xl bg-[#111722] hover:bg-[#182130] border border-[#212c40] text-slate-200 text-xs font-mono font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};