# Vision Engine Dispatch Design

## Goal

When an AI request contains uploaded images, the server first uses a globally configured vision engine to extract image content, then sends the extracted text plus the original user request to the agent's reasoning engine.

## Decisions

- `model_engines` gets a `category` field.
- Categories are `reasoning` and `vision`.
- Existing engines default to `reasoning`.
- AI agents continue to bind only one engine, and that engine must be a `reasoning` engine.
- Vision engines are configured only in the admin engine dispatch center, not in the agent form.
- Runtime uses the first enabled `vision` engine by stable list ordering.
- If images are present but no enabled vision engine exists, the request returns a clear bad-request error instead of silently dropping images.

## Data Flow

1. Web uploads images and sends public image URLs in the AI payload.
2. Server resolves the target agent and its reasoning engine as before.
3. If the request has images, server loads the first enabled vision engine.
4. Server calls the vision engine with the user request and image URLs.
5. Server appends the extracted image description to the text prompt.
6. Server calls the reasoning engine without images.
7. The final assistant answer and model call are saved against the reasoning engine.

## Admin UI

- Engine create/edit form adds a category select with `推理引擎` and `视觉引擎`.
- Engine table shows the category.
- Agent engine select filters out vision engines.

## Testing

- Admin resource tests cover engine category persistence and agent rejection of vision engines.
- AI service tests cover vision pre-processing before reasoning and the missing-vision-engine error.
- Frontend tests cover category controls and agent engine filtering.
