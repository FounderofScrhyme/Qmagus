from datetime import UTC, datetime

import asyncpg


async def check_rate_limit(
    *,
    pool: asyncpg.Pool,
    scope: str,
    subject: str,
    limit: int,
    window_seconds: int,
) -> bool:
    """
    Returns True when the request should be blocked.
    """
    if limit <= 0:
        return False

    now_epoch = int(datetime.now(UTC).timestamp())
    bucket = now_epoch // window_seconds

    await pool.execute(
        """
        DELETE FROM rate_limit_buckets
        WHERE scope = $1 AND subject = $2 AND bucket < $3
        """,
        scope,
        subject,
        bucket - 2,
    )

    count = await pool.fetchval(
        """
        INSERT INTO rate_limit_buckets (scope, subject, bucket, count)
        VALUES ($1, $2, $3, 1)
        ON CONFLICT (scope, subject, bucket)
        DO UPDATE SET
            count = rate_limit_buckets.count + 1,
            updated_at = now()
        RETURNING count
        """,
        scope,
        subject,
        bucket,
    )
    if count is None:
        return False
    return count > limit
