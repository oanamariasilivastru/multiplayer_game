// utils.js

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
      rectangle1.attackBox.position.x + rectangle1.attackBox.width >=
        rectangle2.position.x &&
      rectangle1.attackBox.position.x <=
        rectangle2.position.x + rectangle2.width &&
      rectangle1.attackBox.position.y + rectangle1.attackBox.height >=
        rectangle2.position.y &&
      rectangle1.attackBox.position.y <=
        rectangle2.position.y + rectangle2.height
    )
  }
  
  // Aici doar schimbăm puțin – nu mai avem direct "player" și "enemy" globale.
  // Vom chema "determineWinner(player, enemy)" din client.js cum vrem noi.
  function determineWinner(player, enemy) {
    if (player.health === enemy.health) {
      return 'Tie'
    } else if (player.health > enemy.health) {
      return 'Player 1 Wins'
    } else {
      return 'Player 2 Wins'
    }
  }
  