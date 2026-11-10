package com.snovasys.ledgerline.Config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;
import java.net.URI;

/**
 * Dynamic DataSource Configuration.
 * Seamlessly adapts between:
 * 1. Cloud Managed PostgreSQL (Render, Heroku, AWS via DATABASE_URL or SPRING_DATASOURCE_URL).
 *    Automatically handles "postgres://" or "postgresql://" URLs and parses embedded user:pass.
 * 2. Local In-Memory H2 Database (Zero-setup local development when no external DB is configured).
 */
@Configuration
public class DataSourceConfig {

    private static final Logger log = LoggerFactory.getLogger(DataSourceConfig.class);

    @Value("${DATABASE_URL:#{null}}")
    private String databaseUrlEnv;

    @Value("${spring.datasource.url:#{null}}")
    private String springDatasourceUrl;

    @Value("${spring.datasource.username:#{null}}")
    private String springDatasourceUsername;

    @Value("${spring.datasource.password:#{null}}")
    private String springDatasourcePassword;

    @Bean
    @Primary
    public DataSource dataSource() {
        // Priority: 1. DATABASE_URL (Render standard), 2. SPRING_DATASOURCE_URL
        String rawUrl = databaseUrlEnv != null && !databaseUrlEnv.isBlank()
                ? databaseUrlEnv.trim()
                : (springDatasourceUrl != null && !springDatasourceUrl.isBlank() ? springDatasourceUrl.trim() : null);

        HikariConfig config = new HikariConfig();

        if (rawUrl == null || rawUrl.isBlank()) {
            // Local zero-setup fallback
            log.info("⚡ [DataSource] No external database configured. Using embedded in-memory H2 database (PostgreSQL mode).");
            config.setJdbcUrl("jdbc:h2:mem:balancevault;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL");
            config.setDriverClassName("org.h2.Driver");
            config.setUsername("sa");
            config.setPassword("");
        } else if (rawUrl.startsWith("postgres://") || rawUrl.startsWith("postgresql://")) {
            // Render / Heroku provides postgres://user:password@host:port/database without 'jdbc:'
            try {
                URI uri = URI.create(rawUrl.replaceFirst("^(postgres|postgresql)://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() == -1 ? 5432 : uri.getPort();
                String database = uri.getPath(); // includes leading '/'

                String username = springDatasourceUsername;
                String password = springDatasourcePassword;

                if (uri.getUserInfo() != null && !uri.getUserInfo().isBlank()) {
                    String[] userInfo = uri.getUserInfo().split(":", 2);
                    if (userInfo.length > 0 && (username == null || username.isBlank())) {
                        username = userInfo[0];
                    }
                    if (userInfo.length > 1 && (password == null || password.isBlank())) {
                        password = userInfo[1];
                    }
                }

                String query = uri.getQuery() != null ? "?" + uri.getQuery() : "";
                String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + database + query;
                log.info("🔌 [DataSource] Normalized PostgreSQL JDBC connection to host: {}, port: {}, database: {}", host, port, database);

                config.setJdbcUrl(jdbcUrl);
                config.setDriverClassName("org.postgresql.Driver");
                config.setUsername(username != null ? username : "ledgerline_db_0tkf_user");
                config.setPassword(password != null ? password : "");
            } catch (Exception e) {
                log.warn("⚠️ [DataSource] Error parsing database URI: {}. Falling back to direct jdbc: prefix", e.getMessage());
                String jdbcUrl = rawUrl.startsWith("jdbc:") ? rawUrl : "jdbc:" + rawUrl;
                config.setJdbcUrl(jdbcUrl);
                config.setDriverClassName("org.postgresql.Driver");
                config.setUsername(springDatasourceUsername != null ? springDatasourceUsername : "ledgerline_db_0tkf_user");
                config.setPassword(springDatasourcePassword != null ? springDatasourcePassword : "");
            }
        } else {
            // Already a proper JDBC URL (e.g. jdbc:postgresql://... or jdbc:h2:...)
            log.info("🔌 [DataSource] Using configured JDBC URL: {}", rawUrl);
            config.setJdbcUrl(rawUrl);
            if (rawUrl.contains("postgresql")) {
                config.setDriverClassName("org.postgresql.Driver");
                config.setUsername(springDatasourceUsername != null ? springDatasourceUsername : "ledgerline_db_0tkf_user");
                config.setPassword(springDatasourcePassword != null ? springDatasourcePassword : "P3q3DriP8okgAXOXxBbtzNMLvSiJXDUD");
            } else if (rawUrl.contains("h2")) {
                config.setDriverClassName("org.h2.Driver");
                config.setUsername(springDatasourceUsername != null ? springDatasourceUsername : "sa");
                config.setPassword(springDatasourcePassword != null ? springDatasourcePassword : "");
            }
        }

        // Cloud-optimized Hikari connection pool settings
        config.setMaximumPoolSize(5);
        config.setMinimumIdle(1);
        config.setIdleTimeout(300000); // 5 minutes
        config.setConnectionTimeout(20000); // 20 seconds
        config.setMaxLifetime(600000); // 10 minutes
        config.setPoolName("BalanceVaultHikariPool");

        return new HikariDataSource(config);
    }
}
