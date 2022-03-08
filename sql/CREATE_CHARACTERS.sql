CREATE TABLE IF NOT EXISTS `player_characters` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `first_name` VARCHAR(255) NOT NULL,
  `last_name` VARCHAR(255) NOT NULL,
  `nationality` VARCHAR(255) NOT NULL,
  `backstory` LONGTEXT NOT NULL,
  `dob` VARCHAR(10) NOT NULL,
  `gender` tinyint(1) NOT NULL DEFAULT 0,
  `phone` VARCHAR(11) NOT NULL,
  `job` text COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "[]",
  `metadata` text COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT "[]",
  `created_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_updated` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;
