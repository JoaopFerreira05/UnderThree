# Batalha contra Undyne

## Estado Atual do Desenvolvimento

### 1ª Fase da Batalha

#### Sistema de Defesa (Escudo)
- Implementação de um escudo controlado pelo jogador.
- O escudo permite bloquear projéteis vindos de várias direções.
- A direção do escudo é ajustado em tempo real (ex: cima, baixo, esquerda, direita).
- Feedback visual ao bloquear ataques.

#### Sistema de Ataques (Projéteis)
- Criação de projéteis disparados contra a personagem.
- Gestão de colisões entre projéteis e escudo ou a personagem.

---

## Funcionalidades por Implementar

### 2ª Fase da Batalha

#### Movimento da Personagem
- Introdução de movimento livre da personagem dentro da área de combate.
- Definição de limites da arena.
- Ajuste da velocidade de movimento para equilíbrio entre desafio e jogabilidade.
- Integração com o sistema de colisões (evitar obstáculos e ataques).
- Possibilidade de adicionar estados (ex: correr, desacelerar).

#### Sistema de Ataques (Lanças)
- Implementação de lanças que emergem do chão.
- Definição de padrões de surgimento (sequência em zonas específicas).
- Indicação visual prévia ao jogador (ex: marcas no chão antes da lança aparecer).
- Sincronização com a dificuldade da fase.
- Gestão de colisões entre lanças e personagem.

### Cenário inspirado: Waterfall (Undertale)
- Criação de um ambiente visual inspirado na área "Waterfall".
- Elementos principais:
  - Tons escuros com iluminação azulada.
  - Presença de água (lagos, cascatas, reflexos).
  - Vegetação simples e rochas.
- Integração do cenário com a jogabilidade:
  - Garantir que os elementos não prejudicam a visibilidade dos ataques.

### Integração das Personagens

#### Undyne (Inimiga)
- Implementação da lógica de comportamento.
- Transição entre fases da batalha.
- Animações de ataque e idle.
- Sincronização entre ações e padrões de ataque.

#### Personagem Jogável
- Integração dos sistemas de defesa e movimento.
- Gestão de estados (ex: dano, invulnerabilidade temporária).
- Feedback visual e sonoro ao receber dano.

---

## Considerações Gerais

- Balanceamento progressivo da dificuldade entre fases.
- Clareza visual dos ataques e mecânicas.
- Responsividade dos controlos.
- Testes contínuos para garantir uma experiência fluida e desafiante.