CREATE TABLE IF NOT EXISTS `character_vehicles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `character_id` int(11) NOT NULL,
  `label` varchar(250) NOT NULL,
  `model` varchar(15) NOT NULL,
  `plate` varchar(10) NOT NULL,
  `registered_on` timestamp NOT NULL DEFAULT current_timestamp(),
  
  PRIMARY KEY (`id`),
  KEY `character_id` (`character_id`),
  FOREIGN KEY (`character_id`) REFERENCES `player_characters` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
