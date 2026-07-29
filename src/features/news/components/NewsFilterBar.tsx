"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  NEWS_DATE_RANGE_LABELS,
  NEWS_TOPIC_LABELS,
  type NewsDateRange,
  type NewsFeedFilters,
  type NewsTopic,
} from "@/features/news/types"

interface NewsFilterBarProps {
  filters: NewsFeedFilters
  onChange: (filters: NewsFeedFilters) => void
}

const DATE_RANGES: NewsDateRange[] = ["todos", "hoje", "7dias", "30dias"]
const TOPICS: NewsTopic[] = [
  "DIVIDENDS",
  "EARNINGS",
  "ACQUISITIONS",
  "MERGERS",
  "ECONOMY",
  "POLITICS",
  "TECHNOLOGY",
  "AI",
  "CRYPTO",
]

/// Date range is single-select (Hoje/7 dias/30 dias/Todos); topics are
/// multi-select toggle chips — both update synchronously (discrete
/// choices, no debounce needed, unlike the search box).
export function NewsFilterBar({ filters, onChange }: NewsFilterBarProps) {
  function setDateRange(range: NewsDateRange) {
    onChange({ ...filters, dateRange: range })
  }

  function toggleTopic(topic: NewsTopic) {
    const has = filters.topics.includes(topic)
    onChange({ ...filters, topics: has ? filters.topics.filter((t) => t !== topic) : [...filters.topics, topic] })
  }

  return (
    <div className="space-y-2">
      <div className="flex w-fit flex-wrap gap-0.5 rounded-lg bg-muted p-0.5">
        {DATE_RANGES.map((range) => (
          <Button
            key={range}
            type="button"
            size="sm"
            variant={filters.dateRange === range ? "default" : "ghost"}
            onClick={() => setDateRange(range)}
          >
            {NEWS_DATE_RANGE_LABELS[range]}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TOPICS.map((topic) => {
          const active = filters.topics.includes(topic)
          return (
            <button key={topic} type="button" onClick={() => toggleTopic(topic)}>
              <Badge variant={active ? "default" : "outline"}>{NEWS_TOPIC_LABELS[topic]}</Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}
