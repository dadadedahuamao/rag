"""应用配置：从 .env 读取，集中管理所有可配置项。"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # 应用基础
    app_name: str = "企业级RAG知识库系统"
    app_secret_key: str = "change-me"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    # MySQL
    database_url: str = "mysql+pymysql://root:root@127.0.0.1:3306/rag_kb?charset=utf8mb4"

    # Redis
    redis_url: str = "redis://127.0.0.1:6379/0"

    # Elasticsearch
    elasticsearch_url: str = "http://127.0.0.1:9200"
    elasticsearch_username: str = "elastic"
    elasticsearch_password: str = "changeme"
    es_index_prefix: str = "rag_kb"
    es_verify_certs: bool = False

    # LLM（DeepSeek）
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-v4-pro"
    llm_enabled: bool = True

    # 向量嵌入
    embedding_dim: int = 256

    # 文件与任务
    upload_dir: str = "./data/uploads"
    task_mode: str = "thread"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def llm_ready(self) -> bool:
        """是否可调用真实大模型。"""
        return bool(self.llm_enabled and self.llm_api_key.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
