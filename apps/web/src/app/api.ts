import {createApiClient} from '@pixelvault/api-client';
export {ApiError, operationId, items} from '@pixelvault/api-client';
const client = createApiClient();
export const apiRequest = client.apiRequest;
export const post = client.post;
export const setCsrfToken = client.setCsrfToken;
