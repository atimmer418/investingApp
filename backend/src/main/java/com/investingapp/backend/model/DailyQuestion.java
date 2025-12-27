package com.investingapp.backend.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "daily_questions")
@Getter
@Setter
@NoArgsConstructor
public class DailyQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private LocalDate date;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "daily_question_items", joinColumns = @JoinColumn(name = "daily_question_id"))
    @Column(name = "question_text")
    private List<String> questions;

    public DailyQuestion(LocalDate date, List<String> questions) {
        this.date = date;
        this.questions = questions;
    }
}
