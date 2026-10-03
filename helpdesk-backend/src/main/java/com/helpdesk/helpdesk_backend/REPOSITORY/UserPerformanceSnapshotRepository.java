package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENTITY.UserPerformanceSnapshot;

@Repository
public interface UserPerformanceSnapshotRepository
        extends JpaRepository<UserPerformanceSnapshot, UUID> {

    List<UserPerformanceSnapshot> findByUserOrderByPeriodStartDesc(User user);
}
