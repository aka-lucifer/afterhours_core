CREATE TABLE IF NOT EXISTS `player_bans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_id` int(11) NOT NULL,
  `hardware_id` varchar(255) CHARACTER SET latin1 NOT NULL,
  `reason` longtext NOT NULL,
  `issued_by` int(11) NOT NULL,
  `issued_on` timestamp NOT NULL DEFAULT current_timestamp(),
  `issued_until` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `player_id` (`player_id`),
  KEY `hardware_id` (`hardware_id`),
  KEY `issued_by` (`issued_by`),
  FOREIGN KEY (`player_id`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`hardware_id`) REFERENCES `players` (`hardware_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`issued_by`) REFERENCES `players` (`player_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=latin1;