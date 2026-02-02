'use client';

import Image from 'next/image';
import { Eye } from 'lucide-react';
import {
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip
} from 'recharts';

// --- TYPES ---
type CreatorStats = {
  promptPurity: number;       // Prompt 纯度 (0-100)
  workflowComplexity: number; // 工作流复杂度 (0-100)
  computeFoundation: number;  // 算力底座 (0-100)
};

interface CreatorCardProps {
  creatorName: string;
  creatorAvatarUrl: string;
  workPreviewImageUrl: string;
  stats: CreatorStats;
}

// --- COMPONENT ---
export function CreatorCard({ 
  creatorName, 
  creatorAvatarUrl, 
  workPreviewImageUrl, 
  stats 
}: CreatorCardProps) {

  const radarData = [
    { subject: 'Prompt 纯度', value: stats.promptPurity, fullMark: 100 },
    { subject: '工作流复杂度', value: stats.workflowComplexity, fullMark: 100 },
    { subject: '算力底座', value: stats.computeFoundation, fullMark: 100 },
  ];

  return (
    <div className="group relative w-full max-w-sm md:max-w-4xl rounded-2xl border border-white/10 bg-zinc-900/50 p-4 shadow-lg backdrop-blur-md transition-all duration-300 hover:shadow-cyan-500/20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Side: Work Preview */}
        <div className="relative aspect-square overflow-hidden rounded-lg">
          <Image 
            src={workPreviewImageUrl}
            alt={`${creatorName}'s work preview`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="text-center text-white">
              <Eye className="mx-auto h-8 w-8" />
              <p className="mt-2 font-semibold">查看详情</p>
            </div>
          </div>
        </div>

        {/* Right Side: Radar Chart & Info */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Image 
                src={creatorAvatarUrl}
                alt={creatorName}
                width={48}
                height={48}
                className="rounded-full border-2 border-cyan-400/50"
              />
              <h3 className="text-xl font-bold text-slate-100">{creatorName}</h3>
            </div>
            
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <defs>
                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.5}/>
                    </linearGradient>
                  </defs>
                  <PolarGrid gridType="polygon" stroke="rgba(255, 255, 255, 0.2)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar 
                    name={creatorName}
                    dataKey="value" 
                    stroke="#22d3ee" 
                    fill="url(#radarGradient)" 
                    fillOpacity={0.6}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 10, 0.8)',
                      borderColor: '#22d3ee',
                      borderRadius: '0.5rem',
                      backdropFilter: 'blur(4px)'
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}