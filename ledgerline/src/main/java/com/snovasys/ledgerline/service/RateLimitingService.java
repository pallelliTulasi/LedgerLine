package com.snovasys.ledgerline.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Service
public class RateLimitingService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingService.class);

    private final long capacity;
    private final long durationMinutes;
    private final Map<String, Bucket> localBuckets = new ConcurrentHashMap<>();

    private RedisClient redisClient;
    private StatefulRedisConnection<String, byte[]> redisConnection;
    private ProxyManager<String> proxyManager;
    private boolean redisAvailable = false;

    public RateLimitingService(
            @Value("${balancevault.ratelimit.capacity:20}") long capacity,
            @Value("${balancevault.ratelimit.duration-minutes:1}") long durationMinutes,
            @Value("${spring.data.redis.host:127.0.0.1}") String redisHost,
            @Value("${spring.data.redis.port:6379}") int redisPort,
            @Value("${spring.data.redis.password:}") String redisPassword) {
        this.capacity = capacity;
        this.durationMinutes = durationMinutes;

        try {
            RedisURI.Builder builder = RedisURI.builder()
                    .withHost(redisHost)
                    .withPort(redisPort)
                    .withTimeout(Duration.ofMillis(2000));
            if (redisPassword != null && !redisPassword.isBlank()) {
                builder.withPassword(redisPassword.toCharArray());
            }
            this.redisClient = RedisClient.create(builder.build());
            this.redisConnection = redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));
            this.proxyManager = LettuceBasedProxyManager.builderFor(redisConnection)
                    .withExpirationStrategy(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofMinutes(durationMinutes)))
                    .build();
            this.redisAvailable = true;
            log.info("✅ Redis connected for distributed Bucket4j rate limiting at {}:{}", redisHost, redisPort);
        } catch (Exception e) {
            this.redisAvailable = false;
            log.warn("⚠️ Redis unavailable at {}:{} ({}) - Falling back to in-memory Bucket4j rate limiting", redisHost, redisPort, e.getMessage());
        }
    }

    private Supplier<BucketConfiguration> getConfigSupplier() {
        return () -> BucketConfiguration.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(durationMinutes))
                        .build())
                .build();
    }

    public boolean tryConsume(String key) {
        if (redisAvailable && proxyManager != null) {
            try {
                Bucket bucket = proxyManager.builder().build(key, getConfigSupplier());
                return bucket.tryConsume(1);
            } catch (Exception e) {
                log.warn("Redis rate-limiting failed for key {}, falling back to local: {}", key, e.getMessage());
            }
        }

        // In-memory fallback
        Bucket bucket = localBuckets.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacity)
                        .refillGreedy(capacity, Duration.ofMinutes(durationMinutes))
                        .build())
                .build());
        return bucket.tryConsume(1);
    }

    @PreDestroy
    public void cleanup() {
        if (redisConnection != null) {
            try {
                redisConnection.close();
            } catch (Exception ignored) {}
        }
        if (redisClient != null) {
            try {
                redisClient.shutdown();
            } catch (Exception ignored) {}
        }
    }
}
