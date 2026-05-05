import { api } from './api';
import { Workout, CursorResponse, ApiResponse } from '../types';

export interface FeedQuery {
  cursor?: string;
  limit?: number;
}

const feedService = {
  async getFeed(query: FeedQuery = {}): Promise<CursorResponse<Workout>> {
    const { data } = await api.get<ApiResponse<CursorResponse<Workout>>>('/feed', {
      params: query,
    });
    return data.data!;
  },

  async getExplore(query: FeedQuery = {}): Promise<CursorResponse<Workout>> {
    const { data } = await api.get<ApiResponse<CursorResponse<Workout>>>('/feed/explore', {
      params: query,
    });
    return data.data!;
  },
};

export default feedService;
