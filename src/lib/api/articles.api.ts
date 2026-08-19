import { axiosInstance } from './axios';

export interface Article {
  id: string;
  title: string;
  content: string;
  sector: string;
  status: 'DRAFT' | 'PENDING' | 'PUBLISHED';
  sources: string[];
  contentType?: 'PROPOSAL' | 'ARTICLE' | 'SOCIAL_POST' | null;
  introduction?: string | null;
  outline?: string[];
  socialPost?: string | null;
  aiGenerated?: boolean;
  proposalId?: string | null;
  authorId: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transient proposal — never saved to DB
export interface ArticleProposal {
  /** Present on proposals persisted as articles; absent on freshly generated ones. */
  id?: string;
  title: string;
  introduction: string;
  outline: string[];
  sector: string;
}

export interface CreateArticleDto {
  title: string;
  content: string;
  sector: string;
  sources?: string[];
  status?: 'DRAFT' | 'PENDING';
}

// `status` is widened on update (an article can be published), so it is omitted
// from the inherited shape rather than narrowed against it.
export interface UpdateArticleDto extends Omit<Partial<CreateArticleDto>, 'status'> {
  status?: 'DRAFT' | 'PENDING' | 'PUBLISHED';
}

export const articlesApi = {
  findAll: async (status?: string): Promise<Article[]> => {
    const response = await axiosInstance.get('/articles', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  findOne: async (id: string): Promise<Article> => {
    const response = await axiosInstance.get(`/articles/${id}`);
    return response.data;
  },

  create: async (dto: CreateArticleDto): Promise<Article> => {
    const response = await axiosInstance.post('/articles', dto);
    return response.data;
  },

  update: async (id: string, dto: UpdateArticleDto): Promise<Article> => {
    const response = await axiosInstance.patch(`/articles/${id}`, dto);
    return response.data;
  },

  publish: async (id: string): Promise<Article> => {
    const response = await axiosInstance.post(`/articles/${id}/publish`);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/articles/${id}`);
  },

  // AI generation
  generateProposals: async (): Promise<ArticleProposal[]> => {
    const response = await axiosInstance.post('/articles/generate-proposals', {}, { timeout: 120000 });
    return response.data;
  },

  generateDraft: async (proposal: ArticleProposal): Promise<Article> => {
    const response = await axiosInstance.post('/articles/generate-draft', proposal, { timeout: 120000 });
    return response.data;
  },

  generateSocialPost: async (id: string): Promise<Article> => {
    const response = await axiosInstance.post(`/articles/${id}/generate-social`, {}, { timeout: 60000 });
    return response.data;
  },
};
