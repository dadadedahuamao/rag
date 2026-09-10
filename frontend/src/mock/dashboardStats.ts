// 概览页运行时指标 Mock 数据源
// 说明：今日问答次数、缓存命中率等指标依赖后端实时统计，Mock 阶段以此文件模拟；
// 接入后端时替换为 GET /api/dashboard/stats 的返回结果。
export interface DashboardStats {
  /** 今日问答次数 */
  todayQAs: number
  /** 语义缓存命中率（0-1） */
  cacheHitRate: number
}

export const dashboardStats: DashboardStats = {
  todayQAs: 28,
  cacheHitRate: 0.725,
}
