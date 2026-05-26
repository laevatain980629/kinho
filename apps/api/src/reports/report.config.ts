export const FAULT_TYPE_KEYWORDS: Record<string, string[]> = {
  '液压系统': ['液压', '漏油', '油泵'],
  '发动机': ['发动机', '启动', '动力'],
  '电气系统': ['电气', '电路', '仪表'],
  '行走机构': ['行走', '履带', '跑偏'],
  '回转机构': ['回转', '旋转'],
  '空调系统': ['空调', '制冷'],
};

export const AMOUNT_BUCKETS = [
  { min: 0, max: 5000, label: '<5k' },
  { min: 5000, max: 10000, label: '5k-10k' },
  { min: 10000, max: 20000, label: '10k-20k' },
  { min: 20000, max: Infinity, label: '>20k' },
];
