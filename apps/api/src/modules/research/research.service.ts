import { Injectable, NotFoundException } from '@nestjs/common';
import { RESEARCH_ARTICLES, ResearchArticle } from './research.seed';

@Injectable()
export class ResearchService {
  findAll(query: { category?: string; search?: string; tag?: string }) {
    const search = query.search?.trim().toLowerCase();
    const items = RESEARCH_ARTICLES.filter((article) => {
      if (query.category && query.category !== 'all' && article.category !== query.category) return false;
      if (query.tag && !article.tags.includes(query.tag)) return false;
      if (search) {
        const haystack = `${article.title} ${article.desc} ${article.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
    return {
      items,
      total: items.length,
      categories: Array.from(new Set(RESEARCH_ARTICLES.map((article) => article.category))),
    };
  }

  findOne(id: string): ResearchArticle {
    const article = RESEARCH_ARTICLES.find((item) => item.id === id);
    if (!article) throw new NotFoundException('研究文章不存在');
    return article;
  }
}
