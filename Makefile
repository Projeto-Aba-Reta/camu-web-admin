SHELL := /bin/bash
.DEFAULT_GOAL := dev

SUPABASE_ENV_KEYS := NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ENV_GREP := ^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY)=
SETUP_STAMP := .dev-setup-complete

.PHONY: help dev install env docker-check supabase-up supabase-sync-env db-reset stop status clean

help:
	@echo "make dev       - setup completo (deps, Supabase local, migrations na 1a vez) e inicia o Next.js"
	@echo "make db-reset  - reaplica todas as migrations do zero (apaga dados locais)"
	@echo "make stop      - para os containers do Supabase local"
	@echo "make status    - mostra status/URLs do Supabase local"
	@echo "make clean     - para containers e remove node_modules/.next"

## --- setup ---

install: node_modules

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

.env.local:
	cp .env.example .env.local
	@echo ">> .env.local criado a partir de .env.example"

env: .env.local

docker-check:
	@docker info > /dev/null 2>&1 || { \
		echo "Docker nao esta rodando. Inicie o Docker Desktop (ou daemon) e tente novamente."; \
		exit 1; \
	}

supabase-up: docker-check
	npx supabase start

supabase-sync-env: supabase-up .env.local
	@tmp_keys=$$(mktemp); \
	npx supabase status -o env \
		--override-name api.url=NEXT_PUBLIC_SUPABASE_URL \
		--override-name auth.anon_key=NEXT_PUBLIC_SUPABASE_ANON_KEY \
		--override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY \
		2>/dev/null | grep -E '$(SUPABASE_ENV_GREP)' > "$$tmp_keys"; \
	grep -vE '$(SUPABASE_ENV_GREP)' .env.local > .env.local.tmp || true; \
	cat .env.local.tmp "$$tmp_keys" > .env.local; \
	rm -f .env.local.tmp "$$tmp_keys"; \
	echo ">> Chaves do Supabase local sincronizadas em .env.local"

## --- run ---

dev: install env docker-check supabase-up supabase-sync-env
	@if [ ! -f $(SETUP_STAMP) ]; then \
		echo ">> Primeira vez: aplicando migrations do zero..."; \
		npx supabase db reset; \
		touch $(SETUP_STAMP); \
	else \
		echo ">> Ambiente ja inicializado, pulando reset do banco (use 'make db-reset' para reaplicar migrations)."; \
	fi
	@echo ""
	@port=$$(grep -m1 '^PORT=' .env.local | cut -d= -f2); \
	echo ">> Studio: http://127.0.0.1:54323  |  App: http://localhost:$${port:-3000}"
	@echo ""
	npm run dev

db-reset: docker-check supabase-up
	npx supabase db reset
	@touch $(SETUP_STAMP)

## --- housekeeping ---

stop:
	npx supabase stop

status:
	npx supabase status

clean: stop
	rm -rf node_modules .next $(SETUP_STAMP)
