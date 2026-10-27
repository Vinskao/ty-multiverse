import type { APIRoute } from 'astro';
import graph from '../../../../../storages/macroLogicGraph.json';

// The macro logic chains for the scheduled routine: node ids (analysis codes), series, edges and the analysis format.
export const GET: APIRoute = () => Response.json(graph, { headers: { 'Cache-Control': 'public, max-age=300' } });
